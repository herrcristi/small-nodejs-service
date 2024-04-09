/**
 * Users service
 */
const crypto = require('node:crypto');
const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const UsersAuthRest = require('../rest/users-auth.rest.js');
const EventsRest = require('../rest/events.rest.js');
const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthServiceLocal = require('./users-local-auth.service.js'); // use local auth service
const UsersAuthServiceFirebase = require('./users-firebase-auth.service.js'); // use firebase auth service

/**
 * validation
 */
const Schema = {
  Login: Joi.object().keys({
    email: Joi.string()
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
  Action: BaseServiceUtils.Constants.Action,
  Notification: NotificationsUtils.Constants.Notification,

  // will be initialized on init
  SiteSalt: null,
  UsersAuthProvider: null,

  /**
   * config
   * returns { serviceName, collection, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: UsersAuthConstants.ServiceName,
      //collection: ... // will be added only for local auth
      references: [],
      notifications: {
        projection: { id: 1, type: 1, userID: 1 } /* for sync+async */,
      },
      isFirebaseAuth: Private.UsersAuthProvider === 'firebase',
    };
    return config;
  },

  /**
   * generate salt
   */
  genSalt: (_ctx) => {
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * hash a password
   */
  hashPassword: (password, salt, _ctx) => {
    let hash = crypto.scryptSync(password, salt, 64);
    hash = hash.toString('hex');

    hash = crypto.scryptSync(hash, Private.SiteSalt, 64);
    hash = hash.toString('hex');
    return hash;
  },
};

const Public = {
  /**
   * init
   */
  init: async () => {
    Private.SiteSalt = process.env.SALT;
    Private.UsersAuthProvider = process.env.USERS_AUTH_PROVIDER;
  },

  /**
   * login
   */
  login: async (objInfo, _ctx) => {
    // validate
    const v = Validators.Login.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // login
    // TODO impl
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      // raise event for invalid login
      // await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Post, r.value, r.value, _ctx);
      return r;
    }

    // raise event for login
    // await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Post, r.value, r.value, _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
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

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // token
    // TODO impl
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
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

    // hash password
    objInfo.salt = Private.genSalt(_ctx);
    objInfo.password = Private.hashPassword(objInfo.password, objInfo.salt, _ctx);

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

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
    const eventObj = { id: objInfo.id, name: objInfo.id, type: objInfo.type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Post, eventObj, eventObj, _ctx);

    // raise a notification for new obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Added, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    let r;
    if (config.isFirebaseAuth) {
      r = await UsersAuthServiceFirebase.delete(config, objID, projection, _ctx);
    } else {
      r = await UsersAuthServiceLocal.delete(config, objID, projection, _ctx);
    }
    if (r.error) {
      return r;
    }

    // raise event
    const eventO = { id: objID, name: objID, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Delete, eventO, eventO, _ctx);

    // raise a notification for removed obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Removed, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
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

    // hash password with new salt
    objInfo.salt = Private.genSalt(_ctx);
    objInfo.password = Private.hashPassword(objInfo.password, objInfo.salt, _ctx);

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // put
    let r;
    if (config.isFirebaseAuth) {
      r = await UsersAuthServiceFirebase.put(config, objID, objInfo, projection, _ctx);
    } else {
      r = await UsersAuthServiceLocal.put(config, objID, objInfo, projection, _ctx);
    }
    if (r.error) {
      return r;
    }

    // raise event for put (changed password)
    const eventO = { id: objID, name: objID, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Put, eventO, eventO, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
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

    // hash password with new salt
    patchInfo.set.salt = Private.genSalt(_ctx);
    patchInfo.set.password = Private.hashPassword(patchInfo.set.password, patchInfo.set.salt, _ctx);

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // patch
    let r;
    if (config.isFirebaseAuth) {
      r = await UsersAuthServiceFirebase.patch(config, objID, patchInfo, projection, _ctx);
    } else {
      r = await UsersAuthServiceLocal.patch(config, objID, patchInfo, projection, _ctx);
    }
    if (r.error) {
      return r;
    }

    // raise event for patch (changed password)
    const eventO = { id: objID, name: objID, type: UsersAuthConstants.Type };
    await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Patch, eventO, eventO, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await UsersAuthRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
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

    // { serviceName, collection, references, fillReferences }
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
