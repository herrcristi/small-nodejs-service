/**
 * Users service
 */
const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const UsersAuthRest = require('../rest/users-auth.rest.js');
const UsersRest = require('../rest/users.rest.js');
const EventsRest = require('../rest/events.rest.js');
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
  },
  Notification: NotificationsUtils.Constants.Notification,

  // will be initialized on init
  UsersAuthProviderType: null,

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
};

const Public = {
  /**
   * init
   */
  init: async () => {
    Private.UsersAuthProviderType = process.env.USERS_AUTH_PROVIDER;
    if (Private.UsersAuthProviderType === 'firebase') {
      await UsersAuthServiceFirebase.init();
    } else {
      await UsersAuthServiceLocal.init();
    }
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

    // { serviceName }
    const config = await Private.getConfig(_ctx);

    const eventO = { id: objInfo.id, name: objInfo.id, type: UsersAuthConstants.Type };

    // generic error
    const errorLogin = 'Invalid username/password';
    const rError = { status: 401, error: { message: errorLogin, error: new Error(errorLogin) } };

    // login
    let r;
    if (config.isFirebaseAuth) {
      r = await UsersAuthServiceFirebase.login(config, objInfo, _ctx);
    } else {
      r = await UsersAuthServiceLocal.login(config, objInfo, _ctx);
    }

    if (r.error) {
      // raise event for invalid login
      const srvName = UsersAuthConstants.ServiceName;
      const failedAction = `${Private.Action.Login}.failed`;
      const severity = EventsRest.Constants.Severity.Warning;
      await EventsRest.raiseEventForObject(srvName, failedAction, eventO, eventO, _ctx, severity);
      return rError;
    }

    // get user details
    const userProjection = { id: 1, status: 1, email: 1, schools: 1 };
    const userID = r.value.userID; // TODO objInfo.email
    const rUserDetails = await UsersRest.getOne(userID, userProjection, _ctx); // TODO get one by email
    if (rUserDetails.error) {
      return rError;
    }

    // TODO if user disabled stop

    // TODO if user pending make active
    // if school pending make active

    // raise event for succesful login
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Login, eventO, eventO, _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(rUserDetails, userProjection, _ctx);
  },

  /**
   * validate token
   */
  validate: async (objInfo, _ctx) => {
    // validate
    const v = Validators.Token.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // { serviceName }
    const config = await Private.getConfig(_ctx);

    // token
    // TODO impl
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return {};
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

    // { serviceName }
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
    // { serviceName }
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

    // { serviceName }
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

    // { serviceName }
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

    // { serviceName }
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
