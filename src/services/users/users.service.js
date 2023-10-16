/**
 * Users service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils');
const TranslationsUtils = require('../../core/utils/translations.utils.js');
const CommonUtils = require('../../core/utils/common.utils');
const ReferencesUtils = require('../../core/utils/base-service.references.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const UsersRest = require('../rest/users.rest.js');
const SchoolsRest = require('../rest/schools.rest.js');
const EventsRest = require('../rest/events.rest.js');
const UsersConstants = require('./users.constants.js');
const UsersDatabase = require('./users.database.js');

/**
 * validation
 */
const SchemaSchools = Joi.array().items(
  Joi.object().keys({
    id: Joi.string().min(1).max(64).required(),
    roles: Joi.array()
      .items(
        Joi.string()
          .min(1)
          .max(32)
          .required()
          .valid(...Object.values(UsersConstants.Roles))
      )
      .min(1)
      .required(),
  })
);

const Schema = {
  User: Joi.object().keys({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .min(1)
      .max(128),
    status: Joi.string()
      .min(1)
      .max(64)
      .valid(...Object.values(UsersConstants.Status)),
    name: Joi.string().min(1).max(128),
    birthday: Joi.date().iso(),
    phoneNumber: Joi.string()
      .min(1)
      .max(32)
      .regex(/^(\d|\+|\-|\.|' ')*$/), // allow 0-9 + - . in any order
    address: Joi.string().min(1).max(256),
    schools: SchemaSchools,
  }),
};

const Validators = {
  Post: Schema.User.fork(
    ['email', 'name', 'birthday', 'address', 'schools'],
    (x) => x.required() /*make required */
  ).keys({
    type: Joi.string().valid(UsersConstants.Type),
  }),

  Put: Schema.User,

  Patch: Joi.object().keys({
    // for patch allowed operations are add, remove, set, unset
    set: Schema.User,
    unset: Joi.array().items(Joi.string().min(1).max(128).valid('phoneNumber')),
    add: Joi.object().keys({
      schools: SchemaSchools,
    }),
    remove: Joi.object().keys({
      schools: SchemaSchools,
    }),
  }),
};

const Private = {
  Action: BaseServiceUtils.Constants.Action,
  Notification: NotificationsUtils.Constants.Notification,

  /**
   * config
   * returns { serviceName, collection, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: UsersConstants.ServiceName,
      collection: await UsersDatabase.collection(_ctx),
      references: [
        {
          fieldName: 'schools',
          service: SchoolsRest,
          isArray: true,
          projection: null /*default*/,
        },
      ],
      notifications: {
        projection: { id: 1, name: 1, type: 1, status: 1, schools: 1 } /* for sync+async */,
      },
    };
    return config;
  },
};

const Public = {
  /**
   * init
   */
  init: async () => {},

  /**
   * get all for a request
   * req: { query }
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllForReq: async (req, _ctx) => {
    // convert query to mongo build filter: { filter, projection, limit, skip, sort }
    const rf = await RestApiUtils.buildFilterFromReq(req, Schema.User, _ctx);
    if (rf.error) {
      return rf;
    }
    const filter = rf.value;

    // get all (and expanded too)
    let r = await Public.getAll(filter, _ctx);
    if (r.error) {
      return r;
    }

    // get corresponding count
    let rCount = await Public.getAllCount(filter, _ctx);
    if (rCount.error) {
      return rCount;
    }

    // success
    const metaInfo = RestApiUtils.getMetaInfo(filter, rCount.value, _ctx);
    return {
      status: metaInfo.status,
      value: {
        data: r.value,
        meta: metaInfo.meta,
      },
    };
  },

  /**
   * get all
   * filter: { filter?, projection?, limit?, skip?, sort? }
   * returns { status, value } or { status, error }
   */
  getAll: async (filter, _ctx) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAll(config, filter, _ctx);
  },

  /**
   * get all count
   * filter: { filter? }
   * returns { status, value } or { status, error }
   */
  getAllCount: async (filter, _ctx) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllCount(config, filter, _ctx);
  },

  /**
   * get all by ids
   * returns { status, value } or { status, error }
   */
  getAllByIDs: async (ids, projection, _ctx) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllByIDs(config, ids, projection, _ctx);
  },

  /**
   * get one
   * returns { status, value } or { status, error }
   */
  getOne: async (objID, projection, _ctx) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getOne(config, objID, projection, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    objInfo.type = UsersConstants.Type;
    objInfo.status = objInfo.status || UsersConstants.Status.Pending; // add default status if not set

    // validate
    const v = Validators.Post.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    // populate references
    let rf = await ReferencesUtils.populateReferences({ ...config, fillReferences: true }, objInfo, _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    await Public.translate(objInfo, _ctx);
    objInfo = CommonUtils.patch2obj(objInfo);

    // post
    const r = await DbOpsUtils.post(config, objInfo, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for post
    await EventsRest.raiseEventForObject(UsersConstants.ServiceName, Private.Action.Post, r.value, r.value, _ctx);

    // raise a notification for new obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await UsersRest.raiseNotification(Private.Notification.Added, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.delete(config, objID, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for delete
    await EventsRest.raiseEventForObject(UsersConstants.ServiceName, Private.Action.Delete, r.value, r.value, _ctx);

    // raise a notification for removed obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await UsersRest.raiseNotification(Private.Notification.Removed, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    // validate
    const v = Validators.Put.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    // TODO must take diff before and after for users and trigger notification for deleted changes

    // populate references
    let rf = await ReferencesUtils.populateReferences({ ...config, fillReferences: true }, objInfo, _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    await Public.translate(objInfo, _ctx);

    // put
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for put
    await EventsRest.raiseEventForObject(UsersConstants.ServiceName, Private.Action.Put, r.value, objInfo, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await UsersRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    // validate
    const v = Validators.Patch.validate(patchInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, patchInfo, _ctx);
    }

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    // TODO must take diff before and after for users and trigger notification for deleted changes

    // populate references
    const configRef = { ...config, fillReferences: true };
    let rf = await ReferencesUtils.populateReferences(configRef, [patchInfo.set, patchInfo.add], _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    await Public.translate(patchInfo.set, _ctx);

    // patch
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.patch(config, objID, patchInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for patch
    await EventsRest.raiseEventForObject(UsersConstants.ServiceName, Private.Action.Patch, r.value, patchInfo, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await UsersRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
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

    // notification (process references)
    return await NotificationsUtils.notification({ ...config, fillReferences: true }, notification, _ctx);
  },

  /**
   * translate
   */
  translate: async (obj, _ctx) => {
    const translations = {
      status: TranslationsUtils.string(obj?.status, _ctx),
    };
    return await TranslationsUtils.addTranslations(obj, translations, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: UsersConstants,
};
