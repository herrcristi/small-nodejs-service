/**
 * Professors service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const TranslationsUtils = require('../../core/utils/translations.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const ReferencesUtils = require('../../core/utils/base-service.references.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const EventsRest = require('../rest/events.rest.js');
const UsersRest = require('../rest/users.rest.js');
const ClassesRest = require('../rest/classes.rest.js');
const ProfessorsRest = require('../rest/professors.rest.js');
const ProfessorsConstants = require('./professors.constants.js');
const ProfessorsDatabase = require('./professors.database.js');

/**
 * validation
 */
const SchemaClasses = Joi.array().items(
  Joi.object().keys({
    id: Joi.string().min(1).max(64).required(),
  })
);

const Schema = {
  Professor: Joi.object().keys({
    classes: SchemaClasses,
  }),
};

const Validators = {
  Post: Schema.Professor.fork(['classes'], (x) => x.required() /*make required */).keys({
    id: Joi.string().min(1).max(64).required(),
    type: Joi.string().valid(ProfessorsConstants.Type),
  }),

  Put: Schema.Professor,

  Patch: Joi.object().keys({
    // for patch allowed operations are add, remove, set
    set: Schema.Professor,
    add: Joi.object().keys({
      classes: SchemaClasses,
    }),
    remove: Joi.object().keys({
      classes: SchemaClasses,
    }),
  }),
};

const Private = {
  Action: BaseServiceUtils.Constants.Action,
  Notification: NotificationsUtils.Constants.Notification,
  ResProjection: { ...BaseServiceUtils.Constants.DefaultProjection, user: 1 },

  /**
   * config
   * returns { serviceName, collection, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: ProfessorsConstants.ServiceName,
      collection: await ProfessorsDatabase.collection(_ctx),
      references: [
        {
          fieldName: 'user',
          service: UsersRest,
          isArray: false,
          projection: { id: 1, name: 1, type: 1, status: 1, email: 1 },
        },
        {
          fieldName: 'classes',
          service: ClassesRest,
          isArray: true,
          projection: { id: 1, name: 1, type: 1, status: 1, description: 1, credits: 1, required: 1 },
        },
      ],
      notifications: { projection: Private.ResProjection } /* for sync+async */,
    };
    return config;
  },

  /**
   * get error response for missing tenant
   */
  errorNoTenant: (_ctx) => {
    const msg = 'Missing tenant';
    console.log(`Error: ${msg}`);
    return {
      status: 400,
      error: { message: msg, error: new Error(msg) },
    };
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
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // convert query to mongo build filter: { filter, projection, limit, skip, sort }
    const rf = await RestApiUtils.buildFilterFromReq(req, Schema.Professor, _ctx);
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
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAll(config, filter, _ctx);
  },

  /**
   * get all count
   * filter: { filter? }
   * returns { status, value } or { status, error }
   */
  getAllCount: async (filter, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllCount(config, filter, _ctx);
  },

  /**
   * get all by ids
   * returns { status, value } or { status, error }
   */
  getAllByIDs: async (ids, projection, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllByIDs(config, ids, projection, _ctx);
  },

  /**
   * get one
   * returns { status, value } or { status, error }
   */
  getOne: async (objID, projection, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getOne(config, objID, projection, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    objInfo.type = ProfessorsConstants.Type;

    // validate
    const v = Validators.Post.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo.user = objInfo.id;

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
    const eventObj = { ...r.value, name: r.value.user.name };
    await EventsRest.raiseEventForObject(ProfessorsConstants.ServiceName, Private.Action.Post, eventObj, r.value, _ctx);

    // raise a notification for new obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await ProfessorsRest.raiseNotification(Private.Notification.Added, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  postForUsers: async (users, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // check if already exists first
    const usersIDs = users.map((item) => item.id);
    let existingProfessorsMap = {};
    if (usersIDs.length) {
      let r = await Public.getAllByIDs(usersIDs, { _id: 0, id: 1 }, _ctx);
      if (r.error) {
        return r;
      }
      r.value?.forEach((item) => (existingProfessorsMap[item.id] = true));
    }

    let newUsers = [];
    for (const user of users) {
      if (existingProfessorsMap[user.id]) {
        console.log(`Skipping create professor ${user.id}`);
        continue;
      }

      // create
      r = await Public.post(
        {
          id: user.id,
          classes: [],
        },
        _ctx
      );
      if (r.error) {
        return r;
      }
      newUsers.push(r.value);
    }

    return { status: 201, value: newUsers };
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.delete(config, objID, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for delete
    const eventObj = { ...r.value, name: r.value.user.name };
    await EventsRest.raiseEventForObject(
      ProfessorsConstants.ServiceName,
      Private.Action.Delete,
      eventObj,
      r.value,
      _ctx
    );

    // raise a notification for removed obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await ProfessorsRest.raiseNotification(Private.Notification.Removed, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // validate
    const v = Validators.Put.validate(objInfo);
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

    // put
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for put
    const eventObj = { ...r.value, name: r.value.user.name };
    await EventsRest.raiseEventForObject(ProfessorsConstants.ServiceName, Private.Action.Put, eventObj, objInfo, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await ProfessorsRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // validate
    const v = Validators.Patch.validate(patchInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, patchInfo, _ctx);
    }

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

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
    const eventO = { ...r.value, name: r.value.user.name };
    await EventsRest.raiseEventForObject(
      ProfessorsConstants.ServiceName,
      Private.Action.Patch,
      eventO,
      patchInfo,
      _ctx
    );

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await ProfessorsRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * notification
   * notification: { serviceName, added: [ { id, ... } ], removed, modified  }
   */
  notification: async (notification, _ctx) => {
    // validate
    const v = NotificationsUtils.getNotificationSchema().validate(notification);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, notification, _ctx);
    }

    let tenantNotifications = [];
    if (notification.serviceName === UsersRest.Constants?.ServiceName) {
      // users notification must be filtered by role
      const professorNotification = UsersRest.filterNotificationByRole(notification, ProfessorsConstants.Type, _ctx);
      tenantNotifications = UsersRest.convertToTenantNotifications(professorNotification, _ctx);

      // create new users
      for (const tenantNotif of tenantNotifications) {
        const nCtx = { ..._ctx, tenantID: tenantNotif.tenantID };

        const newUsers = (tenantNotif.notification[Private.Notification.Added] || []).concat(
          tenantNotif.notification[Private.Notification.Modified] || []
        );

        const rN = await Public.postForUsers(newUsers, nCtx);
        if (rN.error) {
          return rN;
        }
      }

      // currently if a role is removed from an org the professors entry will still be kept
      // convert to modified changes with status disabled
      for (const tenantNotif of tenantNotifications) {
        const n = tenantNotif.notification;
        if (n[Private.Notification.Removed]) {
          n[Private.Notification.Modified] = n[Private.Notification.Removed];
          delete n[Private.Notification.Removed];
          for (const user of n[Private.Notification.Modified]) {
            user.status = UsersRest.Constants.Status.Disabled;
          }
        }
      }
    } else {
      // other notification
      tenantNotifications = [{ tenantID: _ctx.tenantID, notification }];
    }

    // process notifications (references) for each tenant
    for (const tenantNotif of tenantNotifications) {
      const nCtx = { ..._ctx, tenantID: tenantNotif.tenantID };
      let config = await Private.getConfig(nCtx); // { serviceName, collection, references, fillReferences }
      config = { ...config, fillReferences: true };

      let r = await NotificationsUtils.notification(config, tenantNotif.notification, nCtx);
      if (r.error) {
        return r;
      }
    }

    return { status: 200, value: true };
  },

  /**
   * translate
   */
  translate: async (obj, _ctx) => {
    const translations = {};
    return await TranslationsUtils.addTranslations(obj, translations, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: ProfessorsConstants,
};
