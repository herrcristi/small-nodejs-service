/**
 * Users service
 */
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const Joi = require('joi');

const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const ValidationUtils = require('../../core/utils/validation.utils.js');
const JwtUtils = require('../../core/utils/jwt.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const UsersAuthRest = require('../rest/users-auth.rest.js');
const UsersRest = require('../rest/users.rest.js');
const EventsRest = require('../rest/events.rest.js');
const SchoolsRest = require('../rest/schools.rest.js');
const UsersAuthConstants = require('./users-auth.constants.js');
const WebServerConstants = require('../../web-server/web-server.constants.js');
const UsersAuthSessionsService = require('./users-auth.sessions.service.js'); // the sessions and the emailed links
const UsersAuthServiceLocal = require('./users-local-auth.service.js'); // use local auth service
const UsersAuthServiceFirebase = require('./users-firebase-auth.service.js'); // use firebase auth service

/**
 * validation
 */

// Stronger password validator: at least 8 chars, upper, lower, digit and special char
const CurrentPassword = Joi.string().min(1).max(64);
const NewPassword = Joi.string()
  .min(8)
  .max(64)
  .pattern(new RegExp('(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9])'))
  .required()
  .messages({ 'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character' });

const Schema = {
  Login: Joi.object().keys({
    username: ValidationUtils.email().required(),
    password: CurrentPassword.required(),
  }),

  User: Joi.object().keys({
    username: ValidationUtils.email().required(),
    password: NewPassword.required(),
    userID: Joi.string().min(1).max(64).required(),
  }),

  UserPass: Joi.object().keys({
    oldPassword: CurrentPassword.required(),
    newPassword: NewPassword.required(),
  }),

  UserName: Joi.object().keys({
    username: ValidationUtils.email().required(),
    password: CurrentPassword.required(),
  }),

  SchoolRoles: Joi.object().keys({
    roles: Joi.array()
      .items(
        Joi.string()
          .min(1)
          .max(32)
          .required()
          .valid(...Object.values(UsersRest.Constants.Roles))
      )
      .min(1)
      .required(),
  }),
};

const Validators = {
  Login: Schema.Login,

  Token: Joi.object().keys({
    token: Joi.string().min(1).required(),
    method: Joi.string().uppercase().min(1).required(), // upper case, as the routes of the roles and ReadMethods
    route: Joi.string().min(1).required(),
  }),

  Post: Schema.User.keys({
    type: Joi.string().valid(UsersAuthConstants.Type),
  }),

  PutPassword: Schema.UserPass,
  PutID: Schema.UserName,

  PatchPassword: Joi.object().keys({
    // for patch allowed operations are: set
    set: Schema.UserPass,
  }),
  PatchID: Joi.object().keys({
    // for patch allowed operations are: set
    set: Schema.UserName,
  }),

  PatchUserSchool: Joi.object()
    .keys({
      // for patch school roles allowed operations are add, remove
      add: Schema.SchoolRoles,
      remove: Schema.SchoolRoles,
    })
    .or('add', 'remove'), // an empty change is refused

  Invite: Joi.object().keys({
    username: ValidationUtils.email(),
    language: Joi.string().valid(...WebServerConstants.Languages), // the language of the email
  }),

  ResetPassword: Joi.object().keys({
    username: ValidationUtils.email(),
    language: Joi.string().valid(...WebServerConstants.Languages), // the language of the email
  }),

  ResetToken: Joi.object().keys({
    token: Joi.string().min(1).required(),
  }),

  PutResetPassword: Joi.object().keys({
    password: NewPassword.required(),
  }),

  // the account of an invited user: its first password and its profile (the same rules as the profile of the users
  // service, Schema.UserProfile; a new user has no name yet: it is required)
  PutSetupAccount: Joi.object().keys({
    password: NewPassword.required(),
    profile: Joi.object()
      .keys({
        name: Joi.string().trim().min(1).max(128).required(),
        birthday: Joi.string().isoDate(),
        phoneNumber: Joi.string()
          .min(1)
          .max(32)
          .regex(/^(\d|\+|\-|\.|' ')*$/), // allow 0-9 + - . in any order
        address: Joi.string().min(1).max(256),
        language: Joi.string().valid(...WebServerConstants.Languages),
      })
      .required(),
  }),
};

const Private = {
  Action: {
    Login: 'login',
    Post: 'post',
    Delete: 'delete',
    PutPassword: 'putPassword',
    Invite: 'invite',
    ResetPassword: 'resetPassword',
    PutResetPassword: 'putResetPassword',
    SetupAccount: 'setupAccount', // the account of an invited user is set up (its first password and its profile)
    PutID: 'putID',
    PatchPassword: 'patchPassword',
    PatchID: 'patchID',
  },
  Notification: NotificationsUtils.Constants.Notification,

  Issuer: UsersAuthConstants.ServiceName,

  ReadMethods: ['GET', 'HEAD'], // the requests that do not change data (the others are authorized on the primary)

  /**
   * Auth Providers
   * will be initialized on init
   */
  UsersAuthProviderType: null,

  RolesApiAccess: {},

  /**
   * config
   * returns { serviceName, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: UsersAuthConstants.ServiceName,
      //collection: ... // will be added only for local auth
      references: [],
    };
    return config;
  },

  /**
   * a new session of the user and its token (the cookie): the record of the session keeps the hash of a secret, the
   * token carries the secret (encrypted)
   * tokenInfo: { username, userID, token? (of the provider) }
   * returns { status, value: token } or { status, error }
   */
  newSession: async (config, tokenInfo, _ctx) => {
    // the record of the session
    const user = { userID: tokenInfo.userID, username: tokenInfo.username };
    const rS = await UsersAuthSessionsService.create(UsersAuthConstants.TokenPurpose.Session, user, _ctx);
    if (rS.error) {
      return rS;
    }

    // the token
    const ProvidersToken = {
      firebase: UsersAuthServiceFirebase.getToken,
      local: UsersAuthServiceLocal.getToken,
    };
    const sessionTokenInfo = { ...tokenInfo, secret: rS.value.secret };
    const rT = await ProvidersToken[Private.UsersAuthProviderType](config, sessionTokenInfo, _ctx);
    if (rT.error) {
      const msg = 'Failed to get token';
      return { status: 500, error: { message: msg, error: new Error(msg) } };
    }

    // encrypt token again
    const rE = JwtUtils.encrypt(rT.value, Private.Issuer, _ctx);
    return { status: 200, value: rE.value };
  },

  /**
   * check the token of an emailed link for its purpose: a reset link does not set up an account, a setup link does not
   * reset a password (the same answer as a link that is not valid: 401)
   * returns { status, value: { purpose, username, userID, linkID } } or { status, error }
   */
  checkLink: async (config, token, purpose, _ctx) => {
    const tokenInfo = { token };
    const v = Validators.ResetToken.validate(tokenInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, tokenInfo, _ctx);
    }

    const r = await Private.checkResetToken(config, v.value.token, _ctx);
    if (r.error) {
      return r;
    }
    if (r.value.purpose !== purpose) {
      const msg = 'The link is not valid';
      return { status: 401, error: { message: msg, error: new Error(msg) } };
    }
    return r;
  },

  /**
   * the page of an emailed link: its link can still be used (for its purpose)
   * objInfo: { token }
   * returns { status, value: { userID, username, type } } or { status, error }
   */
  validateLink: async (objInfo, purpose, _ctx) => {
    // validate
    const v = Validators.ResetToken.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // check the token and its link
    const r = await Private.checkLink(config, v.value.token, purpose, _ctx);
    if (r.error) {
      return r;
    }

    _ctx.username = r.value.username;
    _ctx.userID = r.value.userID;
    return { status: 200, value: { userID: _ctx.userID, username: _ctx.username, type: UsersAuthConstants.Type } };
  },

  /**
   * put a password with an emailed link (for its purpose): the link is used once, the password is set, and all the
   * sessions and the other links of the user are ended
   * returns { status, value: { username, userID } } or { status, error }
   */
  putLinkPassword: async (token, purpose, password, _ctx) => {
    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // check the token and its link
    const rT = await Private.checkLink(config, token, purpose, _ctx);
    if (rT.error) {
      return rT;
    }

    const username = rT.value.username;
    const userID = rT.value.userID;
    _ctx.username = username;
    _ctx.userID = userID;

    // use the link: its record is removed once, so a second use (also at the same time) is refused
    const rUse = await UsersAuthSessionsService.end(rT.value.linkID, _ctx);
    if (rUse.status === 404) {
      const msg = 'The link is not valid anymore';
      return { status: 401, error: { message: msg, error: new Error(msg) } };
    }
    if (rUse.error) {
      return rUse;
    }

    // put the password
    const r = await UsersAuthServiceLocal.putResetPassword(config, username, { password }, _ctx);
    if (r.error) {
      return r;
    }

    // the new password ends all the sessions and the other links of the user
    const rEnd = await UsersAuthSessionsService.endAll(userID, _ctx);
    if (rEnd.error) {
      return rEnd;
    }

    return { status: 200, value: { username, userID } };
  },

  /**
   * a password was set with an emailed link: its event and the modified notification
   */
  notifyPasswordSet: async (username, action, _ctx) => {
    const newObj = { id: username, name: username, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, action, newObj, {} /*args*/, _ctx);
    await UsersAuthRest.raiseNotification(Private.Notification.Modified, [newObj], _ctx);
  },

  /**
   * check a reset token (only for local auth): decrypt it, then check it and its link
   * returns { status, value: { purpose, username, userID, linkID } } or { status, error }
   */
  checkResetToken: async (config, token, _ctx) => {
    // decrypt token
    const decodedToken = JwtUtils.decrypt(token, Private.Issuer, _ctx);
    if (decodedToken.error) {
      return decodedToken;
    }

    // validate reset token
    const validateInfo = { token: decodedToken.value };
    return await UsersAuthServiceLocal.validateResetToken(config, validateInfo, _ctx);
  },

  /**
   * init roles access by role and method
   */
  initRolesAccess: () => {
    const rolesPath = path.join(__dirname, '../config.roles.json');
    const rolesText = fs.readFileSync(rolesPath);
    const roles = JSON.parse(rolesText);
    for (const role in roles.roles) {
      const roleAccess = roles.roles[role];
      Private.RolesApiAccess[role] = {};

      for (const service in roleAccess) {
        const serviceRoles = roleAccess[service];
        for (const method in serviceRoles) {
          Private.RolesApiAccess[role][method.toUpperCase()] ??= {};

          for (const api of serviceRoles[method]) {
            Private.RolesApiAccess[role][method.toUpperCase()][api] = true;
          }
        }
      }
    }
  },

  /**
   * a user that can not log in: disabled
   */
  isLoginRefused: (status) => {
    return status === UsersRest.Constants.Status.Disabled;
  },

  /**
   * delete the login of a user (its email) from the provider: a login that does not exist anymore is not an error
   * returns { status, value: true when it was deleted } or { status, error }
   */
  deleteLogin: async (config, email, _ctx) => {
    const Providers = {
      firebase: UsersAuthServiceFirebase.delete,
      local: UsersAuthServiceLocal.delete,
    };
    const r = await Providers[Private.UsersAuthProviderType](config, email, _ctx);
    if (r.status === 404) {
      return { status: 200, value: false };
    }
    if (r.error) {
      return r;
    }
    return { status: 200, value: true };
  },

  /**
   * the removed users that do not exist anymore (a user removed because its invitation was not used in time): their
   * login is deleted and all their sessions and emailed links are ended
   * users: [ { id, email } ]
   * a failure is logged and the next users are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onUsersRemoved: async (users, _ctx) => {
    const config = await Private.getConfig(_ctx);

    let failure = null; // the first failure (the next users are still done)
    for (const user of users) {
      console.log(`${UsersAuthConstants.ServiceName}: the account of ${user.id} was removed, its login is removed`);

      const rLogin = await Private.deleteLogin(config, user.email, _ctx);
      if (rLogin.error) {
        console.log(
          `\n${UsersAuthConstants.ServiceName}: failed to delete the login of ${user.id}: ${rLogin.error.message}`
        );
        failure ??= rLogin;
        continue;
      }

      const rEnd = await UsersAuthSessionsService.endAll(user.id, _ctx);
      if (rEnd.error) {
        console.log(
          `\n${UsersAuthConstants.ServiceName}: failed to end the sessions of ${user.id}: ${rEnd.error.message}`
        );
        failure ??= rEnd;
      }
    }

    return failure || { status: 200, value: true };
  },

  /**
   * the users notification: the logins of the removed users are removed (a user removed because its invitation was
   * not used in time; a deleted account was already removed by delete)
   * a removed notification is also sent when only some roles of a user are removed (the user still exists, its login
   * is kept): only the users that do not exist anymore lose their login, the ones the users service deleted (their
   * notification has the status deleted: the answer of the delete, not read again, since a secondary may still have
   * the user)
   * returns { status, value } or { status, error }
   */
  onUsersNotification: async (notification, _ctx) => {
    const removedUsers = (notification[Private.Notification.Removed] || []).filter((user) => user.email);

    // the users that do not exist anymore (once each)
    const users = [];
    for (const user of removedUsers) {
      const isDeleted = user.status === UsersRest.Constants.Status.Deleted;
      if (isDeleted && !users.some((item) => item.id === user.id)) {
        users.push(user);
      }
    }
    if (!users.length) {
      return { status: 200, value: false };
    }
    return await Private.onUsersRemoved(users, _ctx);
  },

  /**
   * an email of this type was sent to the user less than EmailInterval ago (a repeated click, a flood of the public
   * forms): it is not sent again; a user without an auth record gets nothing either
   * returns true when it can be sent now
   */
  canSendEmail: async (config, username, emailType, _ctx) => {
    const Providers = {
      firebase: UsersAuthServiceFirebase.putEmailTimestamp,
      local: UsersAuthServiceLocal.putEmailTimestamp,
    };
    const r = await Providers[Private.UsersAuthProviderType](config, username, emailType, _ctx);
    if (r.error) {
      // only the decision is logged: not the kind of email (a reset of a password) nor the address of the person (the
      // forms are public)
      console.log(`\n${UsersAuthConstants.ServiceName}: the email is not sent now (status ${r.status})`);
      return false;
    }
    return true;
  },

  /**
   * check route roles
   */
  isValidRouteForRoles: (roles, method, route) => {
    return roles?.some((role) => Private.RolesApiAccess[role]?.[method.toUpperCase()]?.[route]);
  },

  /**
   * check if matching param
   */
  isValidRouteForParam: (route, paramID, _ctx) => {
    // compare as strings (never build a regular expression from a value that comes from the request)
    // the path of the url, without the query string
    const urlPath = `${_ctx.reqUrl}`.split('?')[0].split('#')[0];

    for (const checkid of [paramID, encodeURIComponent(paramID)]) {
      const expandRoute = `${route}`.replace(':id', () => checkid);

      // either is equal or it starts with expandedRoute/
      if (urlPath === expandRoute || urlPath.startsWith(`${expandRoute}/`)) {
        // valid route
        return true;
      }
    }

    return false;
  },

  /**
   * the memberships of a user: a school with at least one role (a membership left without roles by an earlier version
   * is not a membership)
   */
  getMemberships: (user) => {
    return (user.schools || []).filter((school) => school.roles?.length);
  },

  /**
   * check portal-admin membership on the configured portal school
   */
  isPortalAdmin: (user) => {
    const portalSchoolID = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    return (
      !!portalSchoolID &&
      user.schools?.some(
        (school) =>
          school.id === portalSchoolID &&
          school.status === SchoolsRest.Constants.Status.Active &&
          school.roles?.includes(UsersRest.Constants.Roles.PortalAdmin)
      )
    );
  },

  /**
   * validate a route granted to portal-admin
   * this only grants access: the user must be an active portal-admin and the selected tenant must be the portal school
   * returns null for everything else, so the normal school role validation (and its errors) is applied
   */
  validatePortalAdminRoute: (user, method, route, _ctx) => {
    if (!Private.isValidRouteForRoles(['portal-admin'], method, route)) {
      return null;
    }

    const portalSchoolID = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    if (!Private.isPortalAdmin(user) || _ctx.tenantID !== portalSchoolID) {
      return null;
    }

    const portalSchool = user.schools.find((school) => school.id === portalSchoolID);
    return { status: 200, value: true, tenantName: portalSchool.name, tenantVerified: true };
  },

  /**
   * the answer for a route that does not need a school (all, current-user): the school of the request (x-tenant-id) is used
   * only if the user is a member of it and it is not disabled (tenantVerified), so nobody writes events into a school
   * that is not its own, or that is disabled
   */
  validNoSchoolRoute: (user, _ctx) => {
    const memberships = Private.getMemberships(user);
    const tenantSchool = memberships.find(
      (school) => school.id === _ctx.tenantID && school.status !== SchoolsRest.Constants.Status.Disabled
    );
    return { status: 200, value: true, tenantName: tenantSchool?.name, tenantVerified: !!tenantSchool };
  },

  /**
   * a route of the current user: its :id is the current user (its username for the users-auth routes)
   */
  isCurrentUserRoute: (method, route, _ctx) => {
    if (!Private.isValidRouteForRoles(['current-user'], method, route)) {
      return false;
    }
    const isUsersAuthRoute = new RegExp(`^${UsersAuthRest.Constants.ApiPath}/:id`).test(route);
    const paramID = isUsersAuthRoute ? _ctx.username : _ctx.userID;
    return Private.isValidRouteForParam(route, paramID, _ctx);
  },

  /**
   * the user of a session (by email) and its access to the route of the request
   * objInfo: { method, route }
   * options: { readPreference? } the options of the read of the user (UsersRest.getOneByEmail)
   * returns { status, value: { user, rr } } or { status, error }; rr: the answer of validateRoute
   */
  getSessionUser: async (email, objInfo, _ctx, options) => {
    const userProjection = { id: 1, status: 1, name: 1, email: 1, language: 1, schools: 1 };
    const rUserDetails = await UsersRest.getOneByEmail(email, userProjection, _ctx, options);
    if (rUserDetails.error) {
      return { ...rUserDetails, status: 401 };
    }

    // fail if user is disabled (or its account was deleted)
    const user = rUserDetails.value;
    _ctx.userID = user.id;
    if (Private.isLoginRefused(user.status)) {
      const msg = 'User is disabled';
      return { status: 401, error: { message: msg, error: new Error(msg) } };
    }

    // validate routes
    const rr = Private.validateRoute(user, objInfo.method, objInfo.route, _ctx);
    if (rr.error) {
      return rr;
    }

    return { status: 200, value: { user, rr } };
  },

  /**
   * validate route
   * _ctx: { userID, username, tenantID }
   * returns { status, value, tenantName, tenantVerified } or { status, error }
   */
  validateRoute: (user, method, route, _ctx) => {
    // validate for all (non-tenant) route
    const validGlobalRole = Private.isValidRouteForRoles(['all'], method, route);
    if (validGlobalRole) {
      return Private.validNoSchoolRoute(user, _ctx);
    }

    // the routes of the current user (its own records): also without a school, so a user left without schools can
    // still change its profile; the school of the request is used only if the user is a member of it (a record of a
    // school, like its student, is not found without it)
    if (Private.isCurrentUserRoute(method, route, _ctx)) {
      return Private.validNoSchoolRoute(user, _ctx);
    }

    const portalAdminRoute = Private.validatePortalAdminRoute(user, method, route, _ctx);
    if (portalAdminRoute) {
      return portalAdminRoute;
    }

    // some routes are only for current school
    const isDenyNotCurrentSchool = Private.isValidRouteForRoles(['deny-not-current-school'], method, route);
    if (isDenyNotCurrentSchool) {
      const isValid = Private.isValidRouteForParam(route, _ctx.tenantID /* paramID */, _ctx);
      if (!isValid) {
        const msg = 'school :id restriction applied';
        return { status: 403, error: { message: msg, error: new Error(msg) } };
      }
    }

    // validate per tenant (a membership with a role)
    const memberships = Private.getMemberships(user);
    const validSchool = memberships.find((item) => item.id === _ctx.tenantID);
    if (!validSchool) {
      const msg = 'Failed to validate school';
      return { status: 401, error: { message: msg, error: new Error(msg) } };
    }

    // validate school is not disabled
    if (validSchool.status === SchoolsRest.Constants.Status.Disabled) {
      const msg = 'School is disabled';
      return { status: 401, error: { message: msg, error: new Error(msg) } };
    }

    // validate also route
    const validRole = Private.isValidRouteForRoles(validSchool.roles, method, route);

    if (validRole) {
      // valid
      return { status: 200, value: true, tenantName: validSchool.name, tenantVerified: true };
    }

    const msg = `Route is not accesible: ${method} ${route}`;
    return { status: 403, error: { message: msg, error: new Error(msg) } };
  },
};

const Public = {
  /**
   * init
   */
  init: async () => {
    // init auth provider

    const AuthProviders = {
      firebase: UsersAuthServiceFirebase.init,
      local: UsersAuthServiceLocal.init,
    };

    const authProviderType = process.env.SMALL_API_AUTH_PROVIDER_TYPE;
    const expectedAuthProviders = Object.keys(AuthProviders);
    if (!expectedAuthProviders.includes(authProviderType)) {
      console.log(`Invalid auth provider type ${authProviderType}, expected one of ${expectedAuthProviders}`);
      process.exit(1);
      return false;
    }

    // init token encryption (due to multipod env password must be the same for all pods)
    // allow rotation of password by providing mutiple password to support old tokens
    await JwtUtils.init(Private.Issuer, [process.env.SMALL_API_PREVAUTHPASS, process.env.SMALL_API_AUTHPASS]);

    // init auth provider
    Private.UsersAuthProviderType = authProviderType;
    await AuthProviders[Private.UsersAuthProviderType]();

    // init roles
    Private.initRolesAccess();
  },

  /**
   * login
   * objInfo: { username, password }
   */
  login: async (objInfo, _ctx) => {
    // validate
    const v = Validators.Login.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx); // 400 (the controller answers 401)
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    _ctx.userID = null; // userID is not known at this point, it will be set in the validate function after validating the token
    _ctx.username = objInfo.username;

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // events
    const eventO = { id: objInfo.username, name: objInfo.username, type: UsersAuthConstants.Type };

    // a failed login is not recorded as an event: there can be many (anybody can try), so it is only logged,
    // and the rate limits count the failures of an account
    // the real error is returned (404 unknown account, 401 wrong password, 403 disabled user, 500); the controller
    // answers the same error for all of them, so the user can not tell if an account exists
    const loginFailed = (r, reason) => {
      console.log(`\nLogin failed for ${objInfo.username}: ${reason}`);
      return r;
    };
    const disabled = () => {
      const msg = 'User is disabled';
      return { status: 403, error: { message: msg, error: new Error(msg) } };
    };

    ///
    // login
    ///
    const Providers = {
      firebase: UsersAuthServiceFirebase.login,
      local: UsersAuthServiceLocal.login,
    };
    let rL = await Providers[Private.UsersAuthProviderType](config, objInfo, _ctx);
    if (rL.error) {
      return loginFailed(rL, 'Login failed');
    }

    ///
    // get user details (by email)
    ///
    // read on the primary: a user activated, disabled or given a school by the request before decides the login
    const userProjection = { id: 1, status: 1, name: 1, email: 1, language: 1, schools: 1 };
    const options = { readPreference: DbOpsUtils.Constants.ReadPrimary };
    const rUserDetails = await UsersRest.getOneByEmail(objInfo.username, userProjection, _ctx, options);
    if (rUserDetails.error) {
      return loginFailed(rUserDetails, 'No user details');
    }

    _ctx.userID = rUserDetails.value.id; // set userID in context for events and notifications
    eventO.id = _ctx.userID; // set userID in event object

    // fail login if user is disabled (or its account was deleted)
    const user = rUserDetails.value;
    if (Private.isLoginRefused(user.status)) {
      const rDisabled = disabled();
      return loginFailed(rDisabled, 'User is disabled');
    }

    // if user pending make active
    if (user.status === UsersRest.Constants.Status.Pending) {
      // only a pending user is activated, the answer has the current status
      const rP = await UsersRest.activate(user.id, _ctx);
      if (rP.error) {
        const msg = 'Failed to make user active';
        return { status: 500, error: { message: msg, error: new Error(msg) } };
      }

      // disabled (or deleted) while this login was running: it stays disabled
      if (Private.isLoginRefused(rP.value?.status)) {
        const rDisabled = disabled();
        return loginFailed(rDisabled, 'User is disabled');
      }
      user.status = UsersRest.Constants.Status.Active;
    }

    // if school pending make active (a school that can not be activated stays pending: logged, the login goes on)
    await Public.activatePendingSchools(user, _ctx);

    ///
    // a new session (at every login) and its token
    ///
    const tokenInfo = { token: rL.value, username: objInfo.username, userID: user.id };
    const rT = await Private.newSession(config, tokenInfo, _ctx);
    if (rT.error) {
      return rT;
    }

    ///
    // raise event for succesful login
    ///
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Login, eventO, eventO, _ctx);

    // success
    return {
      status: 200,
      token: rT.value,
      value: {
        userID: _ctx.userID,
        username: _ctx.username,
        status: user.status,
        name: user.name,
        language: user.language, // the language of the UI chosen by the user (none: the default of the UI)
        schools: Private.getMemberships(user),
      },
    };
  },

  /**
   * logout
   */
  logout: async (_ctx) => {
    // _ctx: { userID, username, sessionID }
    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    ///
    // logout
    ///
    const Providers = {
      firebase: UsersAuthServiceFirebase.logout,
      local: UsersAuthServiceLocal.logout,
    };
    let rL = await Providers[Private.UsersAuthProviderType](config, _ctx);
    if (rL.error) {
      return rL;
    }

    // end this session (the other sessions of the user stay open); already ended is not an error
    const rS = await UsersAuthSessionsService.end(_ctx.sessionID, _ctx);
    if (rS.error && rS.status !== 404) {
      return rS;
    }

    // success (the controller clears the cookie)
    return { status: 200, value: {} };
  },

  /**
   * validate token
   * objInfo: { token, method, route }
   */
  validate: async (objInfo, _ctx) => {
    // validate
    const v = Validators.Token.validate(objInfo);
    if (v.error) {
      return {
        ...CommonUtils.getSchemaValidationError(v, objInfo, _ctx),
        status: 401, // return 401 instead of 400
      };
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    ///
    // decrypt token
    ///
    const decodedToken = JwtUtils.decrypt(objInfo.token, Private.Issuer, _ctx);
    if (decodedToken.error) {
      return decodedToken;
    }

    // token
    const validateTokenInfo = { token: decodedToken.value };
    const Providers = {
      firebase: UsersAuthServiceFirebase.validateToken,
      local: UsersAuthServiceLocal.validateToken,
    };
    let rT = await Providers[Private.UsersAuthProviderType](config, validateTokenInfo, _ctx);
    if (rT.error) {
      const msg = 'Failed to validate token';
      return { status: 401, error: { message: msg, error: new Error(msg) } };
    }

    // a request that changes data is authorized on the primary: a session ended, a role removed or a user disabled by
    // the request before changes nothing; a read request (most requests) is authorized on a secondary, where a change
    // is seen after the replication lag, and a refusal there is checked again on the primary (a session, a role or a
    // school given by the request before: a 401 sends the UI to the login)
    const isRead = Private.ReadMethods.includes(objInfo.method);
    const primary = { readPreference: DbOpsUtils.Constants.ReadPrimary };
    const options = isRead ? null : primary;

    // the session is still open: its record exists (not ended by a logout, a password change, a password reset or an
    // email change) and is not expired
    const rSession = await UsersAuthSessionsService.check(rT.value, _ctx, options);
    if (rSession.error) {
      return { ...rSession, status: 401 };
    }

    _ctx.username = rT.value.username;
    _ctx.userID = rT.value.userID;

    ///
    // get user details (by email) and validate the route
    ///
    const email = rT.value.username;
    let rUser = await Private.getSessionUser(email, objInfo, _ctx, options);
    if (rUser.error && isRead) {
      rUser = await Private.getSessionUser(email, objInfo, _ctx, primary);
    }
    if (rUser.error) {
      return rUser;
    }
    const { user, rr } = rUser.value;

    ///
    // success
    ///
    return {
      status: 200,
      value: {
        userID: _ctx.userID,
        username: _ctx.username,
        sessionID: rSession.value.id, // the id of the record of the session (not its secret), for the logout
        sessionExpiresAt: rSession.value.expiresAt,
        tenantName: rr.tenantName,
        tenantVerified: rr.tenantVerified, // false: the school of the request is not used (not a member)
        status: user.status,
        name: user.name,
        language: user.language, // the language of the UI chosen by the user (none: the default of the UI)
        schools: Private.getMemberships(user),
      },
    };
  },

  /**
   * make active the pending schools of the user (a school is pending until a user of the school is authenticated)
   * called at login and when the session is refreshed, to also get the schools that were added after the login; a
   * school that can not be activated is logged and stays pending (the next ones are still done)
   * user: { schools: [ { id, status } ] } the statuses are updated
   * returns { status, value } or { status, error }
   */
  activatePendingSchools: async (user, _ctx) => {
    for (const school of user.schools || []) {
      if (school.status === SchoolsRest.Constants.Status.Pending) {
        // only a pending school is activated (decided on the school itself, not on the referenced one), the answer has
        // its status
        const rS = await SchoolsRest.activate(school.id, _ctx);
        if (rS.error) {
          // the school stays pending and is tried again at the next session refresh; the other schools of the user
          // and the login go on (one broken school does not lock the user out of the others)
          console.log(
            `\n${UsersAuthConstants.ServiceName}: failed to make the school ${school.id} active: ${rS.error.message}`
          );
          continue;
        }

        // update only after it was saved, so the returned statuses are the saved ones (a disabled school stays disabled)
        school.status = rS.value?.status || SchoolsRest.Constants.Status.Active;
      }
    }

    return { status: 200, value: true };
  },

  /**
   * post
   * objInfo: { username, password, userID }
   */
  post: async (objInfo, _ctx) => {
    objInfo.type = UsersAuthConstants.Type;

    // validate
    const v = Validators.Post.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // post
    const Providers = {
      firebase: UsersAuthServiceFirebase.post,
      local: UsersAuthServiceLocal.post,
    };
    let r = await Providers[Private.UsersAuthProviderType](config, objInfo, _ctx);
    if (r.error) {
      return r;
    }

    // raise event
    const newObj = { id: objInfo.userID, name: objInfo.username, type: objInfo.type, userID: objInfo.userID };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Post, newObj, newObj, _ctx);

    // raise a notification for new obj
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Added, [newObj], _ctx);

    // success
    return { status: 201, value: { userID: objInfo.userID, username: objInfo.username, type: objInfo.type } };
  },

  /**
   * delete the account of the user, can be done only by login user (_ctx)
   * (admins remove users from their schools using patchUserSchool)
   * the user is deleted, with its login, its sessions and its links; its records in the schools stay as traces (deleted)
   * or are deleted, by the setting of each school
   */
  delete: async (_ctx) => {
    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // the user first: from now the user can not log in (a user that does not exist is refused), even if the next steps
    // fail
    const rUserDetails = await UsersRest.delete(_ctx.userID, _ctx);
    if (rUserDetails.error) {
      return rUserDetails;
    }

    // its login
    const r = await Private.deleteLogin(config, _ctx.username, _ctx);
    if (r.error) {
      return r;
    }

    // end all the sessions and the links of the user
    const rEnd = await UsersAuthSessionsService.endAll(_ctx.userID, _ctx);
    if (rEnd.error) {
      return rEnd;
    }

    // raise event
    const newObj = { id: _ctx.userID, name: _ctx.username, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Delete, newObj, newObj, _ctx);

    // raise a notification for removed obj
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Removed, [newObj], _ctx);

    // success
    return { status: 200, value: { userID: _ctx.userID, username: _ctx.username, type: UsersAuthConstants.Type } };
  },

  /**
   * put (only password)
   * objInfo: { oldPassword, newPassword }
   * only login user can change password (not even portal admin) for security reason (need old password)
   */
  putPassword: async (objInfo, _ctx, action = Private.Action.PutPassword) => {
    // validate
    const v = Validators.PutPassword.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // put
    const Providers = {
      firebase: UsersAuthServiceFirebase.putPassword,
      local: UsersAuthServiceLocal.putPassword,
    };
    let r = await Providers[Private.UsersAuthProviderType](config, _ctx.username, objInfo, _ctx);
    if (r.error) {
      return r;
    }

    // a new password ends all the sessions and the links of the user: this session continues with a new one
    const rEnd = await UsersAuthSessionsService.endAll(_ctx.userID, _ctx);
    if (rEnd.error) {
      return rEnd;
    }
    const tokenInfo = { username: _ctx.username, userID: _ctx.userID };
    const rT = await Private.newSession(config, tokenInfo, _ctx);
    if (rT.error) {
      return rT;
    }
    const token = rT.value;

    // raise event for put (changed password)
    const newObj = { id: _ctx.userID, name: _ctx.username, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, action, newObj, {} /*args*/, _ctx);

    // raise a notification for modified obj
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Modified, [newObj], _ctx);

    // success (the controller sets the new token as the cookie)
    const value = { userID: _ctx.userID, username: _ctx.username, type: UsersAuthConstants.Type };
    return { status: 200, value, token };
  },

  /**
   * put only id (email)
   * objInfo: { username, password }
   * only login user can change email (not even portal admin) for security reason (need password)
   */
  putID: async (objInfo, _ctx, action = Private.Action.PutID) => {
    // validate
    const v = Validators.PutID.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // put
    const Providers = {
      firebase: UsersAuthServiceFirebase.putID,
      local: UsersAuthServiceLocal.putID,
    };
    let r = await Providers[Private.UsersAuthProviderType](config, _ctx.username, objInfo, _ctx);
    if (r.error) {
      return r;
    }

    // put user details email
    const newUsername = objInfo.username;
    const rUserDetails = await UsersRest.putEmail(_ctx.userID, { email: newUsername }, _ctx);
    if (rUserDetails.error) {
      // restore old id (email)
      const restorePut = { ...objInfo, username: _ctx.username };
      const restoreCtx = { ..._ctx, username: newUsername };
      let r = await Providers[Private.UsersAuthProviderType](config, newUsername, restorePut, restoreCtx);

      return rUserDetails;
    }

    // the sessions have the old email: end all the sessions and the links of the user (the controller clears the
    // cookie, the user logs in again with the new email)
    const rEnd = await UsersAuthSessionsService.endAll(_ctx.userID, _ctx);
    if (rEnd.error) {
      return rEnd;
    }

    // update username in context
    const oldUsername = _ctx.username;
    _ctx.username = newUsername;

    // raise event for put (changed username)
    const newObj = { id: _ctx.userID, name: newUsername, oldUsername: oldUsername, type: UsersAuthConstants.Type };
    const args = { id: newUsername, oldUsername };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, action, newObj, args, _ctx);

    // raise a notification for modified obj
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Modified, [newObj], _ctx);

    // success
    return { status: 200, value: { userID: _ctx.userID, username: _ctx.username, type: UsersAuthConstants.Type } };
  },

  /**
   * patch (only password)
   */
  patchPassword: async (patchInfo, _ctx) => {
    // validate
    const v = Validators.PatchPassword.validate(patchInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, patchInfo, _ctx);
    }
    patchInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    return await Public.putPassword(patchInfo.set, _ctx, Private.Action.PatchPassword);
  },

  /**
   * patch id { set: { username, password} }
   */
  patchID: async (patchInfo, _ctx) => {
    // validate
    const v = Validators.PatchID.validate(patchInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, patchInfo, _ctx);
    }
    patchInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    return await Public.putID(patchInfo.set, _ctx, Private.Action.PatchID);
  },

  /**
   * check the roles that can be given on the selected tenant
   * the portal school is a tenant like the others, but its members are portal admins:
   * portal-admin can be given only on the portal school (and nothing else can be given there)
   * returns null when valid or an error { status, error }
   */
  validateTenantRoles: (roles, _ctx) => {
    const portalSchoolID = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    const isPortalTenant = !!portalSchoolID && _ctx.tenantID === portalSchoolID;

    for (const role of roles) {
      const isPortalRole = role === UsersRest.Constants.Roles.PortalAdmin;
      if (isPortalTenant !== isPortalRole) {
        const msg = isPortalTenant
          ? 'Only the portal-admin role can be given on the portal school'
          : 'The portal-admin role can be given only on the portal school';
        return { status: 403, error: { message: msg, error: new Error(msg) } };
      }
    }

    return null;
  },

  /**
   * patch called by admin to add/remove user to school (_ctx.tenantID)
   * patchInfo: { roles }
   */
  patchUserSchool: async (userID, patchInfo, _ctx) => {
    // validate
    const v = Validators.PatchUserSchool.validate(patchInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, patchInfo, _ctx);
    }
    patchInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // here route is already validated that the current _ctx.username is the admin (or the portal admin for the
    // portal school) of the school (_ctx.tenantID)

    // add the school id
    const patchSchoolInfo = {};
    for (const op of ['add', 'remove']) {
      if (!patchInfo[op]) {
        continue;
      }
      let roles = patchInfo[op].roles;

      // portal-admin only on the portal school
      const rRoles = Public.validateTenantRoles(roles, _ctx);
      if (rRoles) {
        return rRoles;
      }

      // a school admin can not remove its own admin role (another admin, or a portal admin, removes it); return an
      // error and not a success, because nothing is removed. A portal admin can remove its own portal-admin role (a
      // portal left without one gets the configured portal admin again at the next start)
      if (op === 'remove' && _ctx.userID === userID && roles.includes(UsersRest.Constants.Roles.Admin)) {
        const msg = 'You cannot remove yourself as admin';
        return { status: 400, error: { message: msg, error: new Error(msg) } };
      }

      patchSchoolInfo[op] = {
        schools: [{ id: _ctx.tenantID, roles }],
      };
    }

    // the roles of the user in the school: a user who is not a member is not found here (a role is given by an
    // invite), and a patch that changes no role is refused (no write, no event, no notification for nothing)
    // (an internal read: the memberships of the user, whatever the access of the caller to its profile; on the primary:
    // a role given or removed just before decides the change)
    const options = { readPreference: DbOpsUtils.Constants.ReadPrimary };
    const rUsers = await UsersRest.getAllByIDs([userID], { _id: 0, id: 1, schools: 1 }, _ctx, options);
    if (rUsers.error) {
      return rUsers;
    }
    const memberships = rUsers.value[0]?.schools || [];
    const currentRoles = memberships.find((school) => school.id === _ctx.tenantID)?.roles || [];
    if (!currentRoles.length) {
      const msg = 'The user is not a member of this school';
      return { status: 404, error: { message: msg, error: new Error(msg) } };
    }
    const addedRoles = (patchInfo.add?.roles || []).filter((role) => !currentRoles.includes(role));
    const removedRoles = (patchInfo.remove?.roles || []).filter((role) => currentRoles.includes(role));
    if (!addedRoles.length && !removedRoles.length) {
      const msg = 'Nothing to change: the user already has these roles, or does not have the ones to remove';
      return { status: 400, error: { message: msg, error: new Error(msg) } };
    }

    // patch user schools
    const rUserDetails = await UsersRest.patchSchool(userID, patchSchoolInfo, _ctx);
    return rUserDetails;
  },

  /**
   * make sure that a user has its auth record (local auth): an invite or a bootstrap interrupted after the user was
   * created left a user that can not log in nor reset its password; the auth record is created now, with a random
   * password (the user sets its own with the setup link)
   * objInfo: { username, userID }
   * returns { status: 200 (it exists) | 201 (created), value } or { status, error }
   */
  ensureAuth: async (objInfo, _ctx) => {
    if (Private.UsersAuthProviderType !== 'local') {
      return { status: 200, value: { username: objInfo.username } };
    }

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);
    // read on the primary: a record created by the request before is found (it would be created again: 409)
    const options = { readPreference: DbOpsUtils.Constants.ReadPrimary };
    const rAuth = await UsersAuthServiceLocal.getOne(config, objInfo.username, _ctx, options);
    if (rAuth.status !== 404) {
      return rAuth;
    }

    // missing: created with a random password (with the complexity rules)
    console.log(`\nThe auth record of ${objInfo.userID} is missing: it is created`);
    const password = CommonUtils.getRandomBytes(30).toString('hex') + 'aA1!';
    return await Public.post({ username: objInfo.username, password, userID: objInfo.userID }, _ctx);
  },

  /**
   * send the invitation email to an existing user (the invite flow is in UsersAuthSignupService.invite)
   * objInfo: { username, language? } language: of the email (none: the language of the request)
   */
  sendInvite: async (objInfo, _ctx) => {
    // validate
    const v = Validators.Invite.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    const username = objInfo.username;
    const action = Private.Action.Invite;
    const args = { emailType: 'invite', language: objInfo.language || _ctx.lang };

    // at most one each EmailInterval
    const canSend = await Private.canSendEmail(config, username, args.emailType, _ctx);
    if (!canSend) {
      return { status: 200, value: { username, type: UsersAuthConstants.Type } };
    }

    // send email (not waited for: a failed delivery is only logged)
    const Providers = {
      firebase: UsersAuthServiceFirebase.sendEmail,
      local: UsersAuthServiceLocal.sendEmail,
    };
    Providers[Private.UsersAuthProviderType](config, username, args, _ctx);

    // raise event for reset password
    const newObj = { id: username, name: username, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, action, newObj, args, _ctx);

    // success
    return { status: 200, value: { username, type: UsersAuthConstants.Type } };
  },

  /**
   * reset password
   * objInfo: { username, language? } language: of the email (none: the language of the request, the UI of the person)
   */
  resetPassword: async (objInfo, _ctx, resetType = UsersAuthConstants.ResetTokenType.ResetPassword, account = null) => {
    // validate
    const v = Validators.ResetPassword.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    const username = objInfo.username;
    const action = resetType;
    const args = { emailType: resetType, resetType, language: objInfo.language || _ctx.lang };

    // at most one each EmailInterval: the link sent before stays the valid one (a new link would replace it)
    const canSend = await Private.canSendEmail(config, username, args.emailType, _ctx);
    if (!canSend) {
      return { status: 200, value: { username, type: UsersAuthConstants.Type } };
    }

    // reset password
    const Providers = {
      firebase: UsersAuthServiceFirebase.resetPassword,
      local: UsersAuthServiceLocal.resetPassword,
    };
    let r = await Providers[Private.UsersAuthProviderType](config, username, resetType, _ctx, account);
    if (r.error) {
      return r;
    }

    // only for local auth
    if (Private.UsersAuthProviderType === 'local') {
      // encrypt token again
      const token = JwtUtils.encrypt(r.value, Private.Issuer, _ctx).value;

      // send email with token, not waited for (the time of the answer must not tell if the account exists; a failed
      // delivery is only logged)
      UsersAuthServiceLocal.sendEmail(config, username, { ...args, token }, _ctx);
    }

    // raise event for reset password
    const newObj = { id: username, name: username, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, action, newObj, args, _ctx);

    // success
    return { status: 200, value: { username, type: UsersAuthConstants.Type } };
  },

  /**
   * validate the token of a reset link (only for local auth): the link of a reset of the password
   * objInfo: { token }
   */
  validateResetToken: async (objInfo, _ctx) => {
    return await Private.validateLink(objInfo, UsersAuthConstants.ResetTokenType.ResetPassword, _ctx);
  },

  /**
   * validate the token of a setup link (only for local auth): the link of an invitation, that sets up the account
   * objInfo: { token }
   */
  validateSetupToken: async (objInfo, _ctx) => {
    return await Private.validateLink(objInfo, UsersAuthConstants.ResetTokenType.Signup, _ctx);
  },

  /**
   * put the password with the link of a reset (only a reset link)
   * objInfo: { password }
   */
  putResetPassword: async (resetToken, objInfo, _ctx) => {
    // validate
    const v = Validators.PutResetPassword.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // the password, with the link
    const purpose = UsersAuthConstants.ResetTokenType.ResetPassword;
    const r = await Private.putLinkPassword(resetToken, purpose, objInfo.password, _ctx);
    if (r.error) {
      return r;
    }

    const username = r.value.username;
    await Private.notifyPasswordSet(username, Private.Action.PutResetPassword, _ctx);
    return { status: 200, value: { username, type: UsersAuthConstants.Type } };
  },

  /**
   * set up the account with the link of an invitation (only a setup link): the first password and the profile of the
   * user (its own: the user of the link); the profile is validated before the link is used
   * objInfo: { password, profile: { name, birthday?, phoneNumber?, address?, language? } }
   */
  putSetupAccount: async (setupToken, objInfo, _ctx) => {
    // validate
    const v = Validators.PutSetupAccount.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // the first password, with the link
    const purpose = UsersAuthConstants.ResetTokenType.Signup;
    const r = await Private.putLinkPassword(setupToken, purpose, objInfo.password, _ctx);
    if (r.error) {
      return r;
    }

    // the profile of the user
    const rProfile = await UsersRest.put(r.value.userID, objInfo.profile, _ctx);
    if (rProfile.error) {
      return rProfile;
    }

    const username = r.value.username;
    await Private.notifyPasswordSet(username, Private.Action.SetupAccount, _ctx);
    return { status: 200, value: { username, type: UsersAuthConstants.Type } };
  },

  /**
   * notification
   * notification: { serviceName, added?, modified?, removed? }
   */
  notification: async (notification, _ctx) => {
    // validate
    const v = NotificationsUtils.getNotificationSchema().validate(notification);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, notification, _ctx);
    }
    notification = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    switch (notification.serviceName) {
      case UsersRest.Constants.ServiceName:
        return await Private.onUsersNotification(notification, _ctx);
      default:
        console.log(
          `\n${UsersAuthConstants.ServiceName}: notification of ${notification.serviceName} ignored (no reference to it)`
        );
        return { status: 200, value: false };
    }
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: UsersAuthConstants,
};
