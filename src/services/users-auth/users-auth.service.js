/**
 * Users service
 */
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
const Schema = {
  Login: Joi.object().keys({
    id: Joi.string()
      .email({ tlds: { allow: false } })
      .min(1)
      .max(128)
      .required(),
    password: Joi.string().min(1).max(64).required(),
  }),

  User: Joi.object().keys({
    id: Joi.string()
      .email({ tlds: { allow: false } })
      .min(1)
      .max(128)
      .required(),
    password: Joi.string().min(1).max(64).required(),
    userID: Joi.string().min(1).max(64).required(),
  }),

  UserPass: Joi.object().keys({
    password: Joi.string().min(1).max(64).required(),
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

  Put: Schema.UserPass,

  Patch: Joi.object().keys({
    // for patch allowed operations are: set
    set: Schema.UserPass,
  }),
};

const Private = {
  Action: {
    Login: 'login',
    Post: 'post',
    Delete: 'delete',
    Put: 'put',
    Patch: 'patch',
  },
  Notification: NotificationsUtils.Constants.Notification,

  Issuer: UsersAuthConstants.ServiceName,

  // will be initialized on init
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
      isFirebaseAuth: Private.UsersAuthProviderType === 'firebase',
    };
    return config;
  },

  /**
   * init roles access
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
          Private.RolesApiAccess[role][method] ??= {};

          for (const api of serviceRoles[method]) {
            Private.RolesApiAccess[role][method.toUpperCase()][api] = true;
          }
        }
      }
    }
  },
};

const Public = {
  /**
   * init
   */
  init: async () => {
    // init token encryption
    await JwtUtils.init(Private.Issuer);

    // init auth provider
    Private.UsersAuthProviderType = process.env.USERS_AUTH_PROVIDER;
    if (Private.UsersAuthProviderType === 'firebase') {
      await UsersAuthServiceFirebase.init();
    } else {
      await UsersAuthServiceLocal.init();
    }

    // init roles
    Private.initRolesAccess();
  },

  /**
   * login
   * objInfo: { id, password }
   */
  login: async (objInfo, _ctx) => {
    // validate
    const v = Validators.Login.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    _ctx.userID = objInfo.id;
    _ctx.username = objInfo.id;

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // events
    const eventO = { id: objInfo.id, name: objInfo.id, type: UsersAuthConstants.Type };
    const srvName = UsersAuthConstants.ServiceName;
    const failedAction = `${Private.Action.Login}.failed`;
    const failedSeverity = EventsRest.Constants.Severity.Warning;

    // generic error
    const errorLogin = 'Invalid username/password';
    const rError = { status: 401, error: { message: errorLogin, error: new Error(errorLogin) } };

    // login
    let rL;
    if (config.isFirebaseAuth) {
      rL = await UsersAuthServiceFirebase.login(config, objInfo, _ctx);
    } else {
      rL = await UsersAuthServiceLocal.login(config, objInfo, _ctx);
    }

    if (rL.error) {
      // raise event for invalid login
      const eventArgs = { ...eventO, reason: 'Login failed' };
      await EventsRest.raiseEventForObject(srvName, failedAction, eventO, eventArgs, _ctx, failedSeverity);
      return rError; // return generic error
    }

    // get user details (by email)
    const userProjection = { id: 1, status: 1, email: 1, schools: 1 };
    const rUserDetails = await UsersRest.getOneByEmail(objInfo.id, userProjection, _ctx);
    if (rUserDetails.error) {
      // raise event
      const eventArgs = { ...eventO, reason: 'No user' };
      await EventsRest.raiseEventForObject(srvName, failedAction, eventO, eventArgs, _ctx, failedSeverity);
      return rError; // return generic error
    }

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

    // token
    let rT;
    if (config.isFirebaseAuth) {
      rT = await UsersAuthServiceFirebase.getToken(config, { token: rL.value, id: objInfo.id, userID: user.id }, _ctx);
    } else {
      rT = await UsersAuthServiceLocal.getToken(config, { id: objInfo.id, userID: user.id }, _ctx);
    }
    if (rT.error) {
      const msg = 'Failed to get token';
      return { status: 500, error: { message: msg, error: new Error(msg) } };
    }

    // encrypt token again
    rT.value = JwtUtils.encrypt(rT.value, Private.Issuer, _ctx).value;

    // raise event for succesful login
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Login, eventO, eventO, _ctx);

    // success
    return {
      ...BaseServiceUtils.getProjectedResponse(rUserDetails, userProjection, _ctx),
      token: rT.value,
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
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // decrypt token
    const decodedToken = JwtUtils.decrypt(objInfo.token, Private.Issuer, _ctx);
    if (decodedToken.error) {
      return decodedToken;
    }
    objInfo.token = decodedToken.value;

    // token
    let rT;
    if (config.isFirebaseAuth) {
      rT = await UsersAuthServiceFirebase.validateToken(config, objInfo, _ctx);
    } else {
      rT = await UsersAuthServiceLocal.validateToken(config, objInfo, _ctx);
    }
    if (rT.error) {
      const msg = 'Failed to validate token';
      return { status: 401, error: { message: msg, error: new Error(msg) } };
    }

    _ctx.userID = rT.value.id;
    _ctx.username = rT.value.id;

    // get user details (by email)
    const email = rT.value.id;
    const userProjection = { id: 1, status: 1, email: 1, schools: 1 };
    const rUserDetails = await UsersRest.getOneByEmail(email, userProjection, _ctx);
    if (rUserDetails.error) {
      return rUserDetails;
    }

    // fail if user is disabled
    const user = rUserDetails.value;
    if (user.status === UsersRest.Constants.Status.Disabled) {
      const msg = 'User is disabled';
      return { status: 401, error: { message: msg, error: new Error(msg) } };
    }

    // validate global (non-tenant) route
    const isValidRouteForRoles = (roles) => {
      return roles?.some((role) => Private.RolesApiAccess[role]?.[objInfo.method?.toUpperCase()]?.[objInfo.route]);
    };

    const validGlobalRole = isValidRouteForRoles(['all']);
    if (!validGlobalRole) {
      // validate per tenant
      // validate school
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
      const validRole = isValidRouteForRoles(validSchool.roles);
      if (!validRole) {
        const msg = `Route is not accesible: ${objInfo.method} ${objInfo.route}`;
        return { status: 401, error: { message: msg, error: new Error(msg) } };
      }
    }

    // success
    _ctx.userID = user.id;
    _ctx.username = user.email;
    return { status: 200, value: { userID: user.id, username: user.email } };
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    objInfo.type = UsersAuthConstants.Type;

    // validate
    const v = Validators.Post.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // post
    let r;
    if (config.isFirebaseAuth) {
      r = await UsersAuthServiceFirebase.post(config, objInfo, _ctx);
    } else {
      r = await UsersAuthServiceLocal.post(config, objInfo, _ctx);
    }
    if (r.error) {
      return r;
    }

    // raise event
    const newObj = { id: objInfo.id, name: objInfo.id, type: objInfo.type, userID: objInfo.userID };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Post, newObj, newObj, _ctx);

    // raise a notification for new obj
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Added, [newObj], _ctx);

    // success
    return { status: 201, value: newObj };
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    let r;
    if (config.isFirebaseAuth) {
      r = await UsersAuthServiceFirebase.delete(config, objID, _ctx);
    } else {
      r = await UsersAuthServiceLocal.delete(config, objID, _ctx);
    }
    if (r.error) {
      return r;
    }

    // raise event
    const newObj = { id: objID, name: objID, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Delete, newObj, newObj, _ctx);

    // raise a notification for removed obj
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Removed, [newObj], _ctx);

    // success
    return { status: 200, value: newObj };
  },

  /**
   * put (only password)
   */
  put: async (objID, objInfo, _ctx) => {
    // validate
    const v = Validators.Put.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // put
    let r;
    if (config.isFirebaseAuth) {
      r = await UsersAuthServiceFirebase.put(config, objID, objInfo, _ctx);
    } else {
      r = await UsersAuthServiceLocal.put(config, objID, objInfo, _ctx);
    }
    if (r.error) {
      return r;
    }

    // raise event for put (changed password)
    const newObj = { id: objID, name: objID, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Put, newObj, newObj, _ctx);

    // raise a notification for modified obj
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Modified, [newObj], _ctx);

    // success
    return { status: 200, value: newObj };
  },

  /**
   * patch (only password)
   */
  patch: async (objID, patchInfo, _ctx) => {
    // validate
    const v = Validators.Patch.validate(patchInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, patchInfo, _ctx);
    }

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // patch
    let r;
    if (config.isFirebaseAuth) {
      r = await UsersAuthServiceFirebase.patch(config, objID, patchInfo, _ctx);
    } else {
      r = await UsersAuthServiceLocal.patch(config, objID, patchInfo, _ctx);
    }
    if (r.error) {
      return r;
    }

    // raise event for patch (changed password)
    const newObj = { id: objID, name: objID, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Patch, newObj, newObj, _ctx);

    // raise a notification for modified obj
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Modified, [newObj], _ctx);

    // success
    return { status: 200, value: newObj };
  },

  /**
   * notification
   */
  notification: async (notification, _ctx) => {
    // validate
    const v = NotificationsUtils.getNotificationSchema().validate(notification);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, notification, _ctx);
    }

    // config: { serviceName }
    const config = await Private.getConfig(_ctx);

    // TODO delete on delete users notification
    // TODO change id on modified email users notification

    // notification (process references)
    return await NotificationsUtils.notification({ ...config, fillReferences: true }, notification, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: UsersAuthConstants,
};
