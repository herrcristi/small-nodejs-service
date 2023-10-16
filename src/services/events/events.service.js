/**
 * Events service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils');
const TranslationsUtils = require('../../core/utils/translations.utils.js');
const CommonUtils = require('../../core/utils/common.utils');
const ReferencesUtils = require('../../core/utils/base-service.references.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const EventsRest = require('../rest/events.rest.js');
const EventsConstants = require('./events.constants.js');
const EventsDatabase = require('./events.database.js');

/**
 * validation
 */
const Schema = {
  Event: Joi.object().keys({
    severity: Joi.string().valid(...Object.values(BaseServiceUtils.Constants.Severity)),
    messageID: Joi.string().min(1).max(128),
    target: Joi.object().keys({
      id: Joi.string().min(1).max(64).required(),
      name: Joi.string().min(1).max(128).required(),
      type: Joi.string().min(1).max(64).required(),
    }),
    args: Joi.array().items(Joi.string().min(1).max(16384)),
    user: Joi.object().keys({
      id: Joi.string().min(1).max(64).required(),
      name: Joi.string().min(1).max(128).required(),
    }),
  }),
};

const Validators = {
  Post: Schema.Event.fork(['severity', 'messageID', 'target', 'user'], (x) => x.required() /*make required */).keys({
    type: Joi.string().valid(EventsConstants.Type),
    name: Joi.string(),
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
      serviceName: EventsConstants.ServiceName,
      collection: await EventsDatabase.collection(_ctx),
      references: [],
      notifications: {
        /* for sync+async */
        projection: { id: 1, severity: 1, messageID: 1, name: 1, target: 1, args: 1, user: 1, type: 1 },
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
    const rf = await RestApiUtils.buildFilterFromReq(req, Schema.Event, _ctx);
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
    objInfo.type = EventsConstants.Type;
    objInfo.name = objInfo.messageID;

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

    // raise a notification for new obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await EventsRest.raiseNotification(Private.Notification.Added, [rnp.value], _ctx);

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
    let args = [obj?.target.name, obj?.user?.name];
    if (obj?.args) {
      args = [...args, ...obj.args];
    }
    const translations = {
      severity: TranslationsUtils.string(obj?.severity, _ctx),
      message: TranslationsUtils.string(obj?.messageID, _ctx, args), // translate with arguments
    };
    return await TranslationsUtils.addTranslations(obj, translations, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: EventsConstants,
};
