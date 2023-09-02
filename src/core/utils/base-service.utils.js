/**
 * Base service
 */
const Joi = require('joi');

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
   * severity
   */
  Severity: {
    Informational: 'info',
    Warning: 'warning',
    Critical: 'critical',
  },

  /**
   * notification
   */
  Notification: NotificationsUtils.Constants.Notification,
};

const Utils = {
  /**
   * get combined projection from notifications
   * config: { notifications: { projection } }
   */
  getProjection: (config, _ctx) => {
    let projection = { id: 1, name: 1, type: 1, status: 1, createdTimestamp: 1, lastModifiedTimestamp: 1 };

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
    projection = projection || { id: 1, name: 1, type: 1, status: 1, createdTimestamp: 1, lastModifiedTimestamp: 1 };
    const projectedValue = CommonUtils.getProjectedObj(r.value, projection);
    return {
      ...r,
      value: projectedValue,
    };
  },
};

const Public = {
  /**
   * get all for a requst
   * config: { serviceName, collection, schema, references, fillReferences, events, notifications }
   * req: { query }
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllForReq: async (config, req, _ctx) => {
    // convert query to mongo build filter: { filter, projection, limit, skip, sort }
    const filter = await RestApiUtils.buildMongoFilterFromReq(req, config.schema, _ctx);
    if (filter.error) {
      console.log(
        `${config.serviceName}: Failed to build mongo filter from ${req.quey}. Error: ${JSON.stringify(filter.error)}`
      );
      return { status: 400, error: filter.error };
    }

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

    const limit = filter.limit || 0;
    const skip = filter.skip || 0;
    const currentLimit = skip + limit;

    // success
    return {
      status: limit && currentLimit < rCount.value ? 206 /*partial data*/ : 200,
      value: {
        data: r.value,
        meta: {
          count: rCount.value,
          limit,
          skip,
          sort: filter.sort,
        },
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
      console.log(`${config.serviceName}: Failed to getAll. Error: ${JSON.stringify(r.error)}`);
      return r;
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences(config, r.value, _ctx);
    if (rf.error) {
      console.log(
        `${config.serviceName}: Failed to getAll due to populateReferences. Error: ${JSON.stringify(rf.error)}`
      );
      return rf;
    }

    return r;
  },

  getAllCount: async (config, filter, _ctx) => {
    let r = await DbOpsUtils.getAllCount(config, filter, _ctx);
    if (r.error) {
      console.log(`${config.serviceName}: Failed to getAllCount. Error: ${JSON.stringify(r.error)}`);
      return r;
    }
    return r;
  },

  getAllByIDs: async (config, ids, projection, _ctx) => {
    let r = await DbOpsUtils.getAllByIDs(config, ids, projection, _ctx);
    if (r.error) {
      console.log(`${config.serviceName}: Failed to getAllByIDs. Error: ${JSON.stringify(r.error)}`);
      return r;
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences(config, r.value, _ctx);
    if (rf.error) {
      console.log(
        `${config.serviceName}: Failed to getAllByIDs due to populateReferences. Error: ${JSON.stringify(rf.error)}`
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
      console.log(`${config.serviceName}: Failed to getOne for ${objID}. Error: ${JSON.stringify(r.error)}`);
      return r;
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences(config, r.value, _ctx);
    if (rf.error) {
      console.log(
        `${config.serviceName}: Failed to getOne for ${objID} due to populateReferences. Error: ${JSON.stringify(
          rf.error
        )}`
      );
      return rf;
    }

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
      const err = v.error.details[0].message;
      console.log(
        `${config.serviceName}: Failed to post object: ${JSON.stringify(
          CommonUtils.protectData(objInfo)
        )}. Error: ${JSON.stringify(err)}`
      );
      return { status: 400, error: { message: err, error: new Error(err) } };
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences(config, objInfo, _ctx);
    if (rf.error) {
      console.log(
        `${config.serviceName}: Failed to post object: ${JSON.stringify(
          CommonUtils.protectData(objInfo)
        )} due to populateReferences. Error: ${JSON.stringify(rf.error)}`
      );
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
      console.log(
        `${config.serviceName}: Failed to post object: ${JSON.stringify(
          CommonUtils.protectData(objInfo)
        )}. Error: ${JSON.stringify(r.error)}`
      );
      return r;
    }

    console.log(
      `${config.serviceName}: Succesfully post new object: ${JSON.stringify(CommonUtils.protectData(r.value))}`
    );

    // raise event
    if (config.events?.service) {
      await config.events.service.post(
        {
          severity: Constants.Severity.Informational,
          messageID: `${config.serviceName}.${Constants.Action.Post}`,
          target: { id: r.value.id, name: r.value.name, type: r.value.type },
          args: [JSON.stringify(CommonUtils.protectData(r.value))],
          user: { id: _ctx.userid, name: _ctx.username },
        },
        _ctx
      );
    }

    // raise a notification
    if (config.notifications?.service) {
      let rp = Utils.getProjectedResponse(r, config.notifications.projection, _ctx);
      let rn = await config.notifications.service.raiseNotification(Constants.Notification.Added, [rp.value], _ctx);
    }

    // success
    return Utils.getProjectedResponse(r, null, _ctx);
  },

  /**
   * delete
   * config: { serviceName, collection, schema, references, fillReferences, events, notifications }
   * returns: { status, value } or { status, error }
   */
  delete: async (config, objID, _ctx) => {
    const projection = Utils.getProjection(config, _ctx);
    const r = await DbOpsUtils.delete(config, objID, projection, _ctx);
    if (r.error) {
      console.log(`${config.serviceName}: Failed to delete object ${objID}. Error: ${JSON.stringify(r.error)}`);
      return r;
    }

    console.log(
      `${config.serviceName}: Succesfully delete object: ${JSON.stringify(CommonUtils.protectData(r.value))}`
    );

    // raise event
    if (config.events?.service) {
      await config.events.service.post(
        {
          severity: Constants.Severity.Informational,
          messageID: `${config.serviceName}.${Constants.Action.Delete}`,
          target: { id: r.value.id, name: r.value.name, type: r.value.type },
          args: [],
          user: { id: _ctx.userid, name: _ctx.username },
        },
        _ctx
      );
    }

    // raise a notification
    if (config.notifications?.service) {
      let rp = Utils.getProjectedResponse(r, config.notifications.projection, _ctx);
      let rn = await config.notifications.service.raiseNotification(Constants.Notification.Removed, [rp.value], _ctx);
    }

    // use the default projection
    return Utils.getProjectedResponse(r, null, _ctx);
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
      const err = v.error.details[0].message;
      console.log(
        `${config.serviceName}: Failed to put object ${objID}: ${JSON.stringify(
          CommonUtils.protectData(objInfo)
        )}. Error: ${JSON.stringify(err)}`
      );
      return { status: 400, error: { message: err, error: new Error(err) } };
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences(config, objInfo, _ctx);
    if (rf.error) {
      console.log(
        `${config.serviceName}: Failed to put object ${objID}: ${JSON.stringify(
          CommonUtils.protectData(objInfo)
        )} due to populateReferences. Error: ${JSON.stringify(rf.error)}`
      );
      return rf;
    }

    // translate
    if (config.translate) {
      await config.translate(objInfo, _ctx);
    }

    // put
    const projection = Utils.getProjection(config, _ctx);
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx);
    if (r.error) {
      console.log(
        `${config.serviceName}: Failed to put object ${objID}: ${JSON.stringify(
          CommonUtils.protectData(objInfo)
        )}. Error: ${JSON.stringify(r.error)}`
      );
      return r;
    }

    console.log(
      `${config.serviceName}: Succesfully put object ${objID}: ${JSON.stringify(
        objInfo
      )}. Result object: ${JSON.stringify(CommonUtils.protectData(r.value))}`
    );

    // raise event
    if (config.events?.service) {
      await config.events.service.post(
        {
          severity: Constants.Severity.Informational,
          messageID: `${config.serviceName}.${Constants.Action.Put}`,
          target: { id: r.value.id, name: r.value.name, type: r.value.type },
          args: [JSON.stringify(CommonUtils.protectData(objInfo))],
          user: { id: _ctx.userid, name: _ctx.username },
        },
        _ctx
      );
    }

    // raise a notification
    if (config.notifications?.service) {
      let rp = Utils.getProjectedResponse(r, config.notifications.projection, _ctx);
      let rn = await config.notifications.service.raiseNotification(Constants.Notification.Modified, [rp.value], _ctx);
    }

    // use the default projection
    return Utils.getProjectedResponse(r, null, _ctx);
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
      const err = v.error.details[0].message;
      console.log(
        `${config.serviceName}: Failed to patch object ${objID}: ${JSON.stringify(
          CommonUtils.protectData(patchInfo)
        )}. Error: ${JSON.stringify(err)}`
      );
      return { status: 400, error: { message: err, error: new Error(err) } };
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences(config, patchInfo.set, _ctx);
    if (rf.error) {
      console.log(
        `${config.serviceName}: Failed to patch object ${objID}: ${JSON.stringify(
          CommonUtils.protectData(patchInfo)
        )} due to populateReferences for set. Error: ${JSON.stringify(rf.error)}`
      );
      return rf;
    }

    let rfa = await ReferencesUtils.populateReferences(config, patchInfo.add, _ctx);
    if (rfa.error) {
      console.log(
        `${config.serviceName}: Failed to put object ${objID}: ${JSON.stringify(
          CommonUtils.protectData(patchInfo)
        )} due to populateReferences for add. Error: ${JSON.stringify(rfa.error)}`
      );
      return rfa;
    }

    // translate
    if (config.translate) {
      await config.translate(patchInfo.set, _ctx);
    }

    const projection = Utils.getProjection(config, _ctx);
    const r = await DbOpsUtils.patch(config, objID, patchInfo, projection, _ctx);
    if (r.error) {
      console.log(
        `${config.serviceName}: Failed to patch object ${objID}: ${JSON.stringify(
          CommonUtils.protectData(patchInfo)
        )}. Error: ${JSON.stringify(r.error)}`
      );
      return r;
    }

    console.log(
      `${config.serviceName}: Succesfully patch object ${objID}: ${JSON.stringify(
        patchInfo
      )}. Result object: ${JSON.stringify(CommonUtils.protectData(r.value))}`
    );

    // raise event
    if (config.events?.service) {
      await config.events.service.post(
        {
          severity: Constants.Severity.Informational,
          messageID: `${config.serviceName}.${Constants.Action.Patch}`,
          target: { id: r.value.id, name: r.value.name, type: r.value.type },
          args: [JSON.stringify(CommonUtils.protectData(patchInfo))],
          user: { id: _ctx.userid, name: _ctx.username },
        },
        _ctx
      );
    }

    // raise a notification
    if (config.notifications?.service) {
      let rp = Utils.getProjectedResponse(r, config.notifications.projection, _ctx);
      let rn = await config.notifications.service.raiseNotification(Constants.Notification.Modified, [rp.value], _ctx);
    }

    // use the default projection
    return Utils.getProjectedResponse(r, null, _ctx);
  },

  /**
   * process notification
   * config: { serviceName, collection, ..., references, fillReferences }
   * notification: { added: [ { id, ... } ], removed, modified  }
   * returns: { status, value } or { status, error }
   */
  notification: async (config, notification, _ctx) => {
    console.log(`${config.serviceName}: process notification`);
    return await NotificationsUtils.notification(config, notification, _ctx);
  },
};

module.exports = { ...Public, Constants };
