/**
 * Base service
 */
const _ = require('lodash');

const DbOpsUtils = require('./db-ops.utils.js');
const RestApiUtils = require('./rest-api.utils');
const CommonUtils = require('./common.utils');
const ReferencesUtils = require('./base-service.references.utils.js');
const NotificationsUtils = require('./base-service.notifications.utils.js');

const Constants = {
  /**
   * action
   */
  Action: {
    GetAll: 'getAll',
    GetOne: 'getOne',
    Post: 'post',
    Delete: 'delete',
    Put: 'put',
    Patch: 'patch',
  },

  /**
   * notification
   */
  Notification: NotificationsUtils.Constants.Notification,

  /**
   * default projection
   */
  DefaultProjection: {
    _id: 0,
    id: 1,
    name: 1,
    type: 1,
    status: 1,
    createdTimestamp: 1,
    lastModifiedTimestamp: 1,
    modifiedCount: 1,
  },
};

const Public = {
  /**
   * get combined projection from notifications
   * config: { notifications: { projection } }
   */
  getProjection: (config, _ctx) => {
    let projection = { ...Constants.DefaultProjection };

    if (config.notifications?.projection) {
      for (const field in config.notifications.projection) {
        if (config.notifications.projection[field]) {
          projection[field] = 1;
        }
      }
    }

    return projection;
  },

  /**
   * get projected object from
   * config: { notifications: { projection } }
   */
  getProjectedResponse: (r, projection, _ctx) => {
    projection = projection || { ...Constants.DefaultProjection };
    const projectedValue = CommonUtils.getProjectedObj(r.value, projection);
    return {
      ...r,
      value: projectedValue,
    };
  },

  /**
   * get validation error
   */
  getSchemaValidationError: (v, objInfo, _ctx) => {
    const error = `Failed to validate schema. Error: ${_.get(v, 'error.details[0].message')}`;
    console.log(
      `Failed to validate schema: ${JSON.stringify(CommonUtils.protectData(objInfo), null, 2)}. Error: ${error}`
    );
    return { status: 400, error: { message: error, error: new Error(error) } };
  },

  /**
   * get all for a requst
   * config: { serviceName, collection, schema, references, fillReferences, events, notifications }
   * req: { query }
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllForReq: async (config, req, _ctx) => {
    // convert query to mongo build filter: { filter, projection, limit, skip, sort }
    const rf = await RestApiUtils.buildFilterFromReq(req, config.schema, _ctx);
    if (rf.error) {
      return rf;
    }
    const filter = rf.value;

    // get all (and expanded too)
    let r = await Public.getAll(config, filter, _ctx);
    if (r.error) {
      return r;
    }

    // get corresponding count
    let rCount = await Public.getAllCount(config, filter, _ctx);
    if (rCount.error) {
      return rCount;
    }

    const metaInfo = RestApiUtils.getMetaInfo(filter, rCount.value, _ctx);

    // success
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
   * config: { serviceName, collection, schema, references, fillReferences, events, notifications }
   * filter: { filter, projection, limit, skip, sort }
   * returns: { status, value } or { status, error }
   */
  getAll: async (config, filter, _ctx) => {
    let r = await DbOpsUtils.getAll(config, filter, _ctx);
    if (r.error) {
      console.log(`${config.serviceName}: Failed to getAll. Error: ${JSON.stringify(r.error, null, 2)}`);
      return r;
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences(config, r.value, _ctx);
    if (rf.error) {
      console.log(
        `${config.serviceName}: Failed to getAll due to populateReferences. Error: ${JSON.stringify(rf.error, null, 2)}`
      );
      return rf;
    }

    return r;
  },

  getAllCount: async (config, filter, _ctx) => {
    let r = await DbOpsUtils.getAllCount(config, filter, _ctx);
    if (r.error) {
      console.log(`${config.serviceName}: Failed to getAllCount. Error: ${JSON.stringify(r.error, null, 2)}`);
      return r;
    }
    return r;
  },

  getAllByIDs: async (config, ids, projection, _ctx) => {
    let r = await DbOpsUtils.getAllByIDs(config, ids, projection, _ctx);
    if (r.error) {
      console.log(`${config.serviceName}: Failed to getAllByIDs. Error: ${JSON.stringify(r.error, null, 2)}`);
      return r;
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences(config, r.value, _ctx);
    if (rf.error) {
      console.log(
        `${config.serviceName}: Failed to getAllByIDs due to populateReferences. Error: ${JSON.stringify(
          rf.error,
          null,
          2
        )}`
      );
      return rf;
    }

    return r;
  },

  /**
   * get one
   * config: { serviceName, collection, schema, references, fillReferences, events, notifications }
   * returns: { status, value } or { status, error }
   */
  getOne: async (config, objID, projection, _ctx) => {
    let r = await DbOpsUtils.getOne(config, objID, projection, _ctx);
    if (r.error) {
      console.log(`${config.serviceName}: Failed to getOne for ${objID}. Error: ${JSON.stringify(r.error, null, 2)}`);
      return r;
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences(config, r.value, _ctx);
    if (rf.error) {
      console.log(
        `${config.serviceName}: Failed to getOne for ${objID} due to populateReferences. Error: ${JSON.stringify(
          rf.error,
          null,
          2
        )}`
      );
      return rf;
    }

    console.log(
      `${config.serviceName}: Succesfully get one object: ${JSON.stringify(CommonUtils.protectData(r.value), null, 2)}`
    );

    return r;
  },

  /**
   * post
   * config: { serviceName, collection, translate, schema, references, fillReferences, events, notifications }
   * returns: { status, value } or { status, error }
   */
  post: async (config, objInfo, _ctx) => {
    // validate
    const v = config.schema.validate(objInfo);
    if (v.error) {
      return Public.getSchemaValidationError(v, objInfo, _ctx);
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences(config, objInfo, _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    if (config.translate) {
      await config.translate(objInfo, _ctx);
      objInfo = CommonUtils.patch2obj(objInfo);
    }

    // post
    const r = await DbOpsUtils.post(config, objInfo, _ctx);
    if (r.error) {
      return r;
    }

    // raise event
    if (config.events?.service) {
      const eventSrv = config.events.service;
      await eventSrv.raiseEventForObject(config.serviceName, Constants.Action.Post, r.value, r.value, _ctx);
    }

    // raise a notification
    if (config.notifications?.service) {
      let rnp = Public.getProjectedResponse(r, config.notifications.projection, _ctx);
      let rn = await config.notifications.service.raiseNotification(Constants.Notification.Added, [rnp.value], _ctx);
    }

    // success
    return Public.getProjectedResponse(r, null, _ctx);
  },

  /**
   * delete
   * config: { serviceName, collection, schema, references, fillReferences, events, notifications }
   * returns: { status, value } or { status, error }
   */
  delete: async (config, objID, _ctx) => {
    const projection = Public.getProjection(config, _ctx);
    const r = await DbOpsUtils.delete(config, objID, projection, _ctx);
    if (r.error) {
      console.log(
        `${config.serviceName}: Failed to delete object ${objID}. Error: ${JSON.stringify(r.error, null, 2)}`
      );
      return r;
    }

    // raise event
    if (config.events?.service) {
      const eventSrv = config.events.service;
      await eventSrv.raiseEventForObject(config.serviceName, Constants.Action.Delete, r.value, r.value, _ctx);
    }

    // raise a notification
    if (config.notifications?.service) {
      let rp = Public.getProjectedResponse(r, config.notifications.projection, _ctx);
      let rn = await config.notifications.service.raiseNotification(Constants.Notification.Removed, [rp.value], _ctx);
    }

    // use the default projection
    return Public.getProjectedResponse(r, null, _ctx);
  },

  /**
   * put
   * config: { serviceName, collection, translate, schema, references, fillReferences, events, notifications }
   * returns: { status, value } or { status, error }
   */
  put: async (config, objID, objInfo, _ctx) => {
    // validate
    const v = config.schema.validate(objInfo);
    if (v.error) {
      return Public.getSchemaValidationError(v, objInfo, _ctx);
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences(config, objInfo, _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    if (config.translate) {
      await config.translate(objInfo, _ctx);
    }

    // put
    const projection = Public.getProjection(config, _ctx);
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event
    if (config.events?.service) {
      const eventSrv = config.events.service;
      await eventSrv.raiseEventForObject(config.serviceName, Constants.Action.Put, r.value, objInfo, _ctx);
    }

    // raise a notification
    if (config.notifications?.service) {
      let rnp = Public.getProjectedResponse(r, config.notifications.projection, _ctx);
      let rn = await config.notifications.service.raiseNotification(Constants.Notification.Modified, [rnp.value], _ctx);
    }

    // use the default projection
    return Public.getProjectedResponse(r, null, _ctx);
  },

  /**
   * patch
   * config: { serviceName, collection, translate, schema, references, fillReferences, events, notifications }
   * patchInfo: { set, unset, add, remove }
   * returns: { status, value } or { status, error }
   */
  patch: async (config, objID, patchInfo, _ctx) => {
    // validate
    const v = config.schema.validate(patchInfo);
    if (v.error) {
      return Public.getSchemaValidationError(v, patchInfo, _ctx);
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences(config, [patchInfo.set, patchInfo.add], _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    if (config.translate) {
      await config.translate(patchInfo.set, _ctx);
    }

    const projection = Public.getProjection(config, _ctx);
    const r = await DbOpsUtils.patch(config, objID, patchInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event
    if (config.events?.service) {
      const eventSrv = config.events.service;
      await eventSrv.raiseEventForObject(config.serviceName, Constants.Action.Patch, r.value, patchInfo, _ctx);
    }

    // raise a notification
    if (config.notifications?.service) {
      let rnp = Public.getProjectedResponse(r, config.notifications.projection, _ctx);
      let rn = await config.notifications.service.raiseNotification(Constants.Notification.Modified, [rnp.value], _ctx);
    }

    // use the default projection
    return Public.getProjectedResponse(r, null, _ctx);
  },

  /**
   * process notification
   * config: { serviceName, collection, ..., references, fillReferences }
   * notification: { serviceName, added: [ { id, ... } ], removed, modified  }
   * returns: { status, value } or { status, error }
   */
  notification: async (config, notification, _ctx) => {
    // validate
    const v = NotificationsUtils.getNotificationSchema().validate(notification);
    if (v.error) {
      return Public.getSchemaValidationError(v, notification, _ctx);
    }

    // notification (process references)
    return await NotificationsUtils.notification(config, notification, _ctx);
  },
};

module.exports = { ...Public, Constants };
