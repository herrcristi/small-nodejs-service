/**
 * Users service
 */
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const JwtUtils = require('../../core/utils/jwt.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const UsersAuthRest = require('../rest/users-auth.rest.js');
const UsersRest = require('../rest/users.rest.js');
const EventsRest = require('../rest/events.rest.js');
const SchoolsRest = require('../rest/schools.rest.js');
const UsersAuthConstants = require('./users-auth.constants.js');
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
    username: Joi.string()
      .email({ tlds: { allow: false } })
      .min(1)
      .max(128)
      .required(),
    password: CurrentPassword.required(),
  }),

  User: Joi.object().keys({
    username: Joi.string()
      .email({ tlds: { allow: false } })
      .min(1)
      .max(128)
      .required(),
    password: NewPassword.required(),
    userID: Joi.string().min(1).max(64).required(),
  }),

  UserPass: Joi.object().keys({
    oldPassword: CurrentPassword.required(),
    newPassword: NewPassword.required(),
  }),

  UserName: Joi.object().keys({
    username: Joi.string()
      .email({ tlds: { allow: false } })
      .required(),
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
    method: Joi.string().min(1).required(),
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

  PatchUserSchool: Joi.object().keys({
    // for patch school roles allowed operations are add, remove
    add: Schema.SchoolRoles,
    remove: Schema.SchoolRoles,
  }),

  Invite: Joi.object().keys({
    username: Joi.string()
      .email({ tlds: { allow: false } })
      .min(1)
      .max(128),
  }),

  ResetPassword: Joi.object().keys({
    username: Joi.string()
      .email({ tlds: { allow: false } })
      .min(1)
      .max(128),
  }),

  ResetToken: Joi.object().keys({
    token: Joi.string().min(1).required(),
  }),

  PutResetPassword: Joi.object().keys({
    password: NewPassword.required(),
    // TODO if resetType is invite provide all details
    // name: Joi.string().min(1).max(128),
    // birthday: Joi.date().iso(),
    // phoneNumber: Joi.string()
    //   .min(1)
    //   .max(32)
    //   .regex(/^(\d|\+|\-|\.|' ')*$/), // allow 0-9 + - . in any order
    // address: Joi.string().min(1).max(256),
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
    PutID: 'putID',
    PatchPassword: 'patchPassword',
    PatchID: 'patchID',
  },
  Notification: NotificationsUtils.Constants.Notification,

  Issuer: UsersAuthConstants.ServiceName,

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
   * init roles access by role and method
   */
  initRolesAccess: () => {
    const rolesPath = path.join(__dirname, '../config.roles.json');
    const roles = JSON.parse(fs.readFileSync(rolesPath));
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
   * check route roles
   */
  isValidRouteForRoles: (roles, method, route) => {
    return roles?.some((role) => Private.RolesApiAccess[role]?.[method.toUpperCase()]?.[route]);
  },

  /**
   * check if matching param
   */
  isValidRouteForParam: (route, paramID, _ctx) => {
    for (const checkid of [paramID, encodeURIComponent(paramID)]) {
      const expandRoute = `${route}`.replace(':id', checkid);

      // either is equal or it starts with expandedRoute/
      if (new RegExp(`^${expandRoute}([/]|$)`).test(_ctx.reqUrl)) {
        // valid route
        return true;
      }
    }

    return false;
  },

  /**
   * validate route
   * _ctx: { userID, username, tenantID }
   */
  validateRoute: (user, method, route, _ctx) => {
    // validate for all (non-tenant) route
    const validGlobalRole = Private.isValidRouteForRoles(['all'], method, route);
    if (validGlobalRole) {
      return { status: 200, value: true };
    }

    // validate portal-admin route
    const isPortalAdmin = false; // TODO signup can be done only by portal admin
    if (isPortalAdmin) {
      const validPortalAdminRole = Private.isValidRouteForRoles(['portal-admin'], method, route);
      if (validPortalAdminRole) {
        return { status: 200, value: true };
      }
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

    // validate per tenant
    const validSchool = user.schools.find((item) => item.id === _ctx.tenantID);
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

    // some routes are only for current-user
    let validCurrentUser = Private.isValidRouteForRoles(['current-user'], method, route);
    if (validCurrentUser) {
      let paramID = _ctx.userID;
      if (new RegExp(`^${UsersAuthRest.Constants.ApiPath}/:id`).test(route)) {
        paramID = _ctx.username;
      }
      validCurrentUser = Private.isValidRouteForParam(route, paramID, _ctx);
    }

    if (validRole || validCurrentUser) {
      // valid
      return { status: 200, value: true, tenantName: validSchool.name };
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
      return {
        ...CommonUtils.getSchemaValidationError(v, objInfo, _ctx),
        status: 401, // return 401 instead of 400
      };
    }

    _ctx.userID = null; // userID is not known at this point, it will be set in the validate function after validating the token
    _ctx.username = objInfo.username;

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // events
    const eventO = { id: objInfo.username, name: objInfo.username, type: UsersAuthConstants.Type };
    const srvName = UsersAuthConstants.ServiceName;
    const failedAction = `${Private.Action.Login}.failed`;
    const failedSeverity = EventsRest.Constants.Severity.Warning;

    // generic error
    const errorLogin = 'Invalid username/password';
    const rError = { status: 401, error: { message: errorLogin, error: new Error(errorLogin) } };

    ///
    // login
    ///
    const Providers = {
      firebase: UsersAuthServiceFirebase.login,
      local: UsersAuthServiceLocal.login,
    };
    let rL = await Providers[Private.UsersAuthProviderType](config, objInfo, _ctx);
    if (rL.error) {
      // raise event for invalid login
      const eventArgs = { ...eventO, reason: 'Login failed' };
      await EventsRest.raiseEventForObject(srvName, failedAction, eventO, eventArgs, _ctx, failedSeverity);
      return rError; // return generic error
    }

    ///
    // get user details (by email)
    ///
    const userProjection = { id: 1, status: 1, name: 1, email: 1, schools: 1 };
    const rUserDetails = await UsersRest.getOneByEmail(objInfo.username, userProjection, _ctx);
    if (rUserDetails.error) {
      // raise event
      const eventArgs = { ...eventO, reason: 'No user details' };
      await EventsRest.raiseEventForObject(srvName, failedAction, eventO, eventArgs, _ctx, failedSeverity);
      return rError; // return generic error
    }

    _ctx.userID = rUserDetails.value.id; // set userID in context for events and notifications
    eventO.id = _ctx.userID; // set userID in event object

    // fail login if user is disabled
    const user = rUserDetails.value;
    if (user.status === UsersRest.Constants.Status.Disabled) {
      // raise event
      const eventArgs = { ...eventO, reason: 'User is disabled' };
      await EventsRest.raiseEventForObject(srvName, failedAction, eventO, eventArgs, _ctx, failedSeverity);
      return rError; // return generic error
    }

    // if user pending make active
    if (user.status === UsersRest.Constants.Status.Pending) {
      user.status = UsersRest.Constants.Status.Active;
      const rP = await UsersRest.put(user.id, { status: UsersRest.Constants.Status.Active }, _ctx);
      if (rP.error) {
        const msg = 'Failed to make user active';
        return { status: 500, error: { message: msg, error: new Error(msg) } };
      }
    }

    // if school pending make active
    for (const school of user.schools) {
      if (school.status === SchoolsRest.Constants.Status.Pending) {
        school.status = SchoolsRest.Constants.Status.Active;
        const rS = await SchoolsRest.put(school.id, { status: SchoolsRest.Constants.Status.Active }, _ctx);
        if (rS.error) {
          const msg = 'Failed to make school active';
          return { status: 500, error: { message: msg, error: new Error(msg) } };
        }
      }
    }

    ///
    // token
    ///
    const ProvidersToken = {
      firebase: UsersAuthServiceFirebase.getToken,
      local: UsersAuthServiceLocal.getToken,
    };
    let rT = await ProvidersToken[Private.UsersAuthProviderType](
      config,
      { token: rL.value, username: objInfo.username, userID: user.id },
      _ctx
    );
    if (rT.error) {
      const msg = 'Failed to get token';
      return { status: 500, error: { message: msg, error: new Error(msg) } };
    }

    // encrypt token again
    rT.value = JwtUtils.encrypt(rT.value, Private.Issuer, _ctx).value;

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
        schools: user.schools,
      },
    };
  },

  /**
   * logout
   */
  logout: async (_ctx) => {
    // _ctx: { userID, username }
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

    // success empty token
    return {
      status: 200,
      value: {},
      token: 'token',
    };
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

    _ctx.username = rT.value.username;
    _ctx.userID = rT.value.userID;

    ///
    // get user details (by email)
    ///
    const email = rT.value.username;
    const userProjection = { id: 1, status: 1, email: 1, schools: 1 };
    const rUserDetails = await UsersRest.getOneByEmail(email, userProjection, _ctx);
    if (rUserDetails.error) {
      return { ...rUserDetails, status: 401 };
    }

    // fail if user is disabled
    const user = rUserDetails.value;
    _ctx.userID = user.id;
    if (user.status === UsersRest.Constants.Status.Disabled) {
      const msg = 'User is disabled';
      return { status: 401, error: { message: msg, error: new Error(msg) } };
    }

    ///
    // validate routes
    ///
    const rr = Private.validateRoute(user, objInfo.method, objInfo.route, _ctx);
    if (rr.error) {
      return rr;
    }

    ///
    // success
    ///
    return { status: 200, value: { userID: _ctx.userID, username: _ctx.username, tenantName: rr.tenantName } };
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
   * delete the user can be done only by login user (_ctx)
   * (admins can delete users from tenants using patchUserSchool)
   */
  delete: async (_ctx) => {
    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    const Providers = {
      firebase: UsersAuthServiceFirebase.delete,
      local: UsersAuthServiceLocal.delete,
    };
    let r = await Providers[Private.UsersAuthProviderType](config, _ctx.username, _ctx);
    if (r.error) {
      return r;
    }

    // delete user details
    const rUserDetails = await UsersRest.delete(_ctx.userID, _ctx);
    if (rUserDetails.error) {
      return rUserDetails;
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

    // raise event for put (changed password)
    const newObj = { id: _ctx.userID, name: _ctx.username, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, action, newObj, {} /*args*/, _ctx);

    // raise a notification for modified obj
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Modified, [newObj], _ctx);

    // success
    return { status: 200, value: { userID: _ctx.userID, username: _ctx.username, type: UsersAuthConstants.Type } };
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
      const restorePut = { ...objInfo, id: _ctx.username };
      const restoreCtx = { ..._ctx, username: newUsername };
      let r = await Providers[Private.UsersAuthProviderType](config, newUsername, restorePut, restoreCtx);

      return rUserDetails;
    }

    // update username in context
    const oldUsername = _ctx.username;
    _ctx.username = newUsername;

    // raise event for put (changed username)
    const newObj = { id: _ctx.userID, name: newUsername, oldID: oldUsername, type: UsersAuthConstants.Type };
    const args = { id: newUsername };
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

    return await Public.putPassword(patchInfo.set, _ctx, Private.Action.PatchPassword);
  },

  /**
   * patch id (email)
   */
  patchID: async (patchInfo, _ctx) => {
    // validate
    const v = Validators.PatchID.validate(patchInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, patchInfo, _ctx);
    }

    return await Public.putID(patchInfo.set, _ctx, Private.Action.PatchID);
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

    // here route is already validated that the current _ctx.username is the admin of the school (_ctx.tenantID)

    // add the school id
    const patchSchoolInfo = {};
    for (const op of ['add', 'remove']) {
      if (!patchInfo[op]) {
        continue;
      }
      let roles = patchInfo[op].roles;

      // prevent removing itself as admin
      if (op === 'remove' && _ctx.userID === userID) {
        roles = roles.filter((item) => item !== UsersRest.Constants.Roles.Admin);
      }
      if (!roles.length) {
        continue;
      }

      patchSchoolInfo[op] = {
        schools: [{ id: _ctx.tenantID, roles }],
      };
    }

    // patch user schools
    const rUserDetails = await UsersRest.patchSchool(userID, patchSchoolInfo, _ctx);
    return rUserDetails;
  },

  /**
   * invite user to school
   * objInfo: { username }
   */
  invite: async (objInfo, _ctx) => {
    // validate
    const v = Validators.Invite.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    const username = objInfo.username;
    const action = Private.Action.Invite;
    const args = { emailType: 'invite' };

    // send email
    const Providers = {
      firebase: UsersAuthServiceFirebase.sendEmail,
      local: UsersAuthServiceLocal.sendEmail,
    };
    await Providers[Private.UsersAuthProviderType](config, username, args, _ctx);

    // raise event for reset password
    const newObj = { id: username, name: username, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, action, newObj, args, _ctx);

    // success
    return { status: 200, value: { username, type: UsersAuthConstants.Type } };
  },

  /**
   * reset password
   * objInfo: { username }
   */
  resetPassword: async (objInfo, _ctx, resetType = UsersAuthConstants.ResetTokenType.ResetPassword) => {
    // validate
    const v = Validators.ResetPassword.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    const username = objInfo.username;
    const action = resetType;
    const args = { emailType: resetType, resetType };

    // reset password
    const Providers = {
      firebase: UsersAuthServiceFirebase.resetPassword,
      local: UsersAuthServiceLocal.resetPassword,
    };
    let r = await Providers[Private.UsersAuthProviderType](config, username, _ctx);
    if (r.error) {
      return r;
    }

    // only for local auth
    if (Private.UsersAuthProviderType === 'local') {
      // encrypt token again
      const token = JwtUtils.encrypt(r.value, Private.Issuer, _ctx).value;
      // send email with token
      await UsersAuthServiceLocal.sendEmail(config, username, { ...args, token }, _ctx);
    }

    // raise event for reset password
    const newObj = { id: username, name: username, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, action, newObj, args, _ctx);

    // success
    return { status: 200, value: { username, type: UsersAuthConstants.Type } };
  },

  /**
   * validate reset token (only for local auth)
   * objInfo: { token }
   */
  validateResetToken: async (objInfo, _ctx) => {
    // validate
    const v = Validators.ResetToken.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // decrypt token
    const decodedToken = JwtUtils.decrypt(objInfo.token, Private.Issuer, _ctx);
    if (decodedToken.error) {
      return decodedToken;
    }

    // validate reset token
    const validateInfo = { token: decodedToken.value };
    let r = await UsersAuthServiceLocal.validateResetToken(config, validateInfo, _ctx);
    if (r.error) {
      return r;
    }

    _ctx.username = r.value.username;
    _ctx.userID = r.value.userID;

    // success
    return { status: 200, value: { userID: _ctx.userID, username: _ctx.username, type: UsersAuthConstants.Type } };
  },

  /**
   * validate reset token and put reset password
   * objInfo: { password }
   */
  putResetPassword: async (resetToken, objInfo, _ctx) => {
    // validate
    const v = Validators.PutResetPassword.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // check reset token
    const resetTokenInfo = { token: resetToken };
    let rT = await Public.validateResetToken(resetTokenInfo, _ctx);
    if (rT.error) {
      return rT;
    }

    const username = rT.value.username;

    // put reset password
    const putResetPasswordInfo = { password: objInfo.password };
    let r = await UsersAuthServiceLocal.putResetPassword(config, username, putResetPasswordInfo, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for put reset password
    const newObj = { id: username, name: username, type: UsersAuthConstants.Type };
    const action = Private.Action.PutResetPassword;
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, action, newObj, {} /*args*/, _ctx);

    // raise a notification for modified obj
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Modified, [newObj], _ctx);

    // success
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

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // notification (process references)
    return await NotificationsUtils.notification({ ...config, fillReferences: true }, notification, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: UsersAuthConstants,
};
