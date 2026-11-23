/**
 * Events service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DatabaseManagerUtils = require('../../core/utils/database-manager.utils.js');
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
    severity: Joi.string().valid(...Object.values(EventsConstants.Severity)),
    messageID: Joi.string().min(1).max(128),
    target: Joi.object().keys({
      id: Joi.string().min(1).max(64).required(),
      name: Joi.string().min(1).max(128).required(),
      type: Joi.string().min(1).max(64).required(),
    }),
    args: Joi.array().items(Joi.string().min(1).max(16384)),
    user: Joi.object().keys({
      id: Joi.string().min(1).max(64).required(),
      username: Joi.string().min(1).max(128).required(),
    }),
  }),
};

const Validators = {
  Get: {
    filter: [
      'id',
      'createdTimestamp',
      'name',
      'severity',
      'messageID',
      'message',
      'target.id',
      'target.name',
      'target.type',
      'user.id',
      'user.username',
    ], // some have index
    sort: { createdTimestamp: -1 },
  },

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
   * returns { serviceName, collection, maxTimeMS, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: EventsConstants.ServiceName,
      collection: await EventsDatabase.collection(_ctx),
      maxTimeMS: DatabaseManagerUtils.getMaxTimeMS(), // the time limit of each database call (DbOpsUtils)
      references: [],
      notifications: {
        /* for sync+async */
        projection: { id: 1, severity: 1, messageID: 1, name: 1, target: 1, args: 1, user: 1, type: 1 },
      },
    };
    return config;
  },

  /**
   * the portal school is the tenant of the request (only portal admins can select it)
   */
  isPortalTenant: (_ctx) => {
    const portalSchoolID = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    return !!portalSchoolID && _ctx.tenantID === portalSchoolID;
  },

  /**
   * error for the routes of the portal admins called on another school
   */
  portalRequired: () => {
    const msg = 'Portal school access required';
    return { status: 403, error: { message: msg, error: new Error(msg) } };
  },

  /**
   * the details of an event by name, for its message: the event arguments are JSON objects, so
   * { school, reason, set: { status } } gives {school}, {reason} and {set.status}; only text, numbers and booleans
   * are kept (not lists)
   */
  getNamedArgs: (args) => {
    const named = {};
    const add = (value, path, depth) => {
      if (['string', 'number', 'boolean'].includes(typeof value)) {
        named[path] = value;
        return;
      }
      if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 3) {
        return;
      }
      for (const key of Object.keys(value)) {
        const keyPath = path ? `${path}.${key}` : key;
        add(value[key], keyPath, depth + 1);
      }
    };

    for (const arg of args || []) {
      let value;
      try {
        value = JSON.parse(arg);
      } catch (e) {
        continue; // not a JSON text: no named arguments
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        add(value, '', 0);
      }
    }
    return named;
  },

  /**
   * the context of the global events: no tenant (the events that do not belong to a school, like the logins and the
   * password resets, are in the global collection)
   */
  getGlobalCtx: (_ctx) => {
    return { ..._ctx, tenantID: undefined };
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
    const rf = await RestApiUtils.buildFilterFromReq(req, Validators.Get, _ctx);
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
   * get all the global events for a request: only portal admins (on the portal school)
   * req: { query }
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllGlobalForReq: async (req, _ctx) => {
    if (!Private.isPortalTenant(_ctx)) {
      return Private.portalRequired();
    }

    const globalCtx = Private.getGlobalCtx(_ctx);
    return await Public.getAllForReq(req, globalCtx);
  },

  /**
   * get one global event: only portal admins (on the portal school)
   * returns { status, value } or { status, error }
   */
  getOneGlobal: async (objID, projection, _ctx) => {
    if (!Private.isPortalTenant(_ctx)) {
      return Private.portalRequired();
    }

    const globalCtx = Private.getGlobalCtx(_ctx);
    return await Public.getOne(objID, projection, globalCtx);
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
   * get all by ids: the objects referenced by another service before it writes them (populateReferences) or a read that
   * decides a write (the roles of a user)
   * options: the options of the read, built by the caller (populateReferences and the roles of a user ask the primary:
   *   an object written just before, by an earlier request or by another service, is found)
   * returns { status, value } or { status, error }
   */
  getAllByIDs: async (ids, projection, _ctx, options) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllByIDs(config, ids, projection, _ctx, options);
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
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

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
      return CommonUtils.getSchemaValidationError(v, notification, _ctx);
    }
    notification = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // the events reference no objects of other services: nothing to do (no subscription)
    console.log(
      `\n${EventsConstants.ServiceName}: notification of ${notification.serviceName} ignored (no reference to it)`
    );
    return { status: 200, value: false };
  },

  /**
   * translate
   */
  translate: async (obj, _ctx) => {
    // all by name: the details of the event ({school}, {reason}, ...), {target} the target and {user} the user who did
    // it (these two win over a detail with the same name)
    const namedArgs = Private.getNamedArgs(obj?.args);
    const args = { ...namedArgs, target: obj?.target?.name, user: obj?.user?.username };
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
