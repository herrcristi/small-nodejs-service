/**
 * Base service
 */
const Joi = require('joi');

const DbOpsUtils = require('./db-ops.utils.js');
const RestApiUtils = require('./rest-api.utils');
const CommonUtils = require('./common.utils');

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
  Notification: {
    Added: 'added',
    Modified: 'modified',
    Removed: 'removed',
  },
};

const SchemaNotificationsObjects = Joi.array()
  .items(
    Joi.object()
      .keys({ id: Joi.string().min(1).max(64).required() })
      .unknown(true)
  )
  .required();

const Schema = {
  /**
   * notification schema
   */
  Notification: Joi.object().keys({
    serviceName: Joi.string().min(1).max(64).required(),
    added: SchemaNotificationsObjects,
    modified: SchemaNotificationsObjects,
    removed: SchemaNotificationsObjects,
  }),
};

const Utils = {
  /**
   * get ids from fieldName
   */
  collectIDs: (targetsMap, objs, i, fieldName) => {
    let obj = objs[i];
    if (obj && fieldName) {
      obj = obj[fieldName];
    }
    if (!obj) {
      return;
    }

    // there are 4 situations: string, object.id, array of strings, array of object.id
    if (Array.isArray(obj)) {
      for (const i in obj) {
        Utils.collectIDs(targetsMap, obj, i, '');
      }
    } else if (typeof obj === 'string') {
      // assume string is the id
      targetsMap[obj] = 1;
    } else if (typeof obj === 'object') {
      if (obj.id) {
        targetsMap[obj.id] = 1;
      }
    }
  },

  /**
   * populate
   */
  populate: (targetsMap, objs, i, fieldName) => {
    let obj = objs[i];
    if (obj && fieldName) {
      obj = obj[fieldName];
    }
    if (!obj) {
      return;
    }

    // there are 4 situations: string, object.id, array of strings, array of object.id
    if (Array.isArray(obj)) {
      for (const i in obj) {
        Utils.populate(targetsMap, obj, i, '');
      }
    } else if (typeof obj === 'string') {
      const details = targetsMap[obj];
      if (details) {
        // must set in parent
        if (fieldName) {
          objs[i][fieldName] = details;
        } else {
          objs[i] = details;
        }
      }
    } else if (typeof obj === 'object') {
      if (obj.id) {
        const details = targetsMap[obj.id];
        if (details) {
          Object.assign(obj, details);
        }
      }
    }
  },

  /**
   * get combined projection from all subscribers
   */
  getSubscribersProjection: (subscribers, _ctx) => {
    let projection = { id: 1, name: 1, type: 1, status: 1 };

    for (const sub of subscribers || []) {
      if (!sub.projection) {
        continue;
      }
      for (const field in sub.projection) {
        if (sub.projection[field]) {
          projection[field] = 1;
        }
      }
    }
    return projection;
  },

  /**
   * raise sync notification
   * config: { serviceName, collection, schema, references, fillReferences, events, subscribers }
   * subscribers: { service, projection }
   */
  raiseNotification: async (config, action, obj, _ctx) => {
    const defaultProjection = { id: 1, name: 1, type: 1, status: 1 };

    for (const sub of config.subscribers || []) {
      let objProjected = {};
      for (const field of sub.projection || defaultProjection) {
        objProjected[field] = obj[field];
      }

      // do a sync notification
      let r = sub.service?.notification(
        {
          serviceName: config.serviceName,
          [action]: [objProjected],
        },
        _ctx
      );
      if (!r) {
        return r;
      }
    }

    return { status: 200, value: true };
  },
};

const Public = {
  /**
   * get all for a requst
   * config: { serviceName, collection, schema, references, fillReferences, events, subscribers }
   * req: { query }
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllForReq: async (config, req, _ctx) => {
    // convert query to mongo build filter: { filter, projection, limit, skip, sort }
    const filter = await RestApiUtils.buildMongoFilterFromReq(req, config.schema, _ctx);
    if (filter.error) {
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
   * config: { serviceName, collection, schema, references, fillReferences, events, subscribers }
   * filter: { filter, projection, limit, skip, sort }
   * returns: { status, value } or { status, error }
   */
  getAll: async (config, filter, _ctx) => {
    let r = await DbOpsUtils.getAll(config, filter, _ctx);
    if (r.error) {
      return r;
    }

    // populate references
    let rf = await Public.populateReferences(config, r.value, _ctx);
    if (rf.error) {
      return rf;
    }

    return r;
  },

  getAllCount: async (config, filter, _ctx) => {
    return await DbOpsUtils.getAllCount(config, filter, _ctx);
  },

  getAllByIDs: async (config, ids, projection, _ctx) => {
    let r = await DbOpsUtils.getAllByIDs(config, ids, projection, _ctx);
    if (r.error) {
      return r;
    }

    // populate references
    let rf = await Public.populateReferences(config, r.value, _ctx);
    if (rf.error) {
      return rf;
    }

    return r;
  },

  /**
   * get one
   * config: { serviceName, collection, schema, references, fillReferences, events, subscribers }
   * returns: { status, value } or { status, error }
   */
  getOne: async (config, objID, projection, _ctx) => {
    let r = await DbOpsUtils.getOne(config, objID, projection, _ctx);
    if (r.error) {
      return r;
    }

    // populate references
    let rf = await Public.populateReferences(config, r.value, _ctx);
    if (rf.error) {
      return rf;
    }

    return r;
  },

  /**
   * post
   * config: { serviceName, collection, schema, references, fillReferences, events, subscribers }
   * returns: { status, value } or { status, error }
   */
  post: async (config, objInfo, _ctx) => {
    // validate
    const v = config.schema.validate(objInfo);
    if (v.error) {
      const err = v.error.details[0].message;
      return { status: 400, error: { message: err, error: new Error(err) } };
    }

    // populate references
    let rf = await Public.populateReferences(config, objInfo, _ctx);
    if (rf.error) {
      return rf;
    }

    // post
    const r = await DbOpsUtils.post(config, objInfo, _ctx);
    if (r.error) {
      return r;
    }

    r.value = {
      id: r.value.id,
      name: r.value.name,
      type: r.value.type,
      status: r.value.status,
    };

    console.log(`Post succesful new object with id: ${r.value.id}, name: ${r.value.name}`);

    // raise event
    if (config.events?.service) {
      await config.events.service.post(
        {
          severity: Constants.Severity.Informational,
          messageID: `${config.serviceName}.${Constants.Action.Post}`,
          target: { id: r.value.id, name: r.value.name, type: r.value.type },
          args: [JSON.stringify(CommonUtils.protectData(objInfo))],
          user: { id: _ctx.userid, name: _ctx.username },
        },
        _ctx
      );
    }

    // raise a sync notification
    let rn = await Utils.raiseNotification(config, Constants.Notification.Added, objInfo, _ctx);

    // success
    return r;
  },

  /**
   * delete
   * config: { serviceName, collection, schema, references, fillReferences, events, subscribers }
   * returns: { status, value } or { status, error }
   */
  delete: async (config, objID, _ctx) => {
    const projection = Utils.getSubscribersProjection(config.subscribers, _ctx);
    const r = await DbOpsUtils.delete(config, objID, projection, _ctx);
    if (r.error) {
      return r;
    }

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

    // raise a sync notification
    let rn = await Utils.raiseNotification(config, Constants.Notification.Removed, r.value, _ctx);

    return r;
  },

  /**
   * put
   * config: { serviceName, collection, schema, references, fillReferences, events, subscribers }
   * returns: { status, value } or { status, error }
   */
  put: async (config, objID, objInfo, _ctx) => {
    // validate
    const v = config.schema.validate(objInfo);
    if (v.error) {
      const err = v.error.details[0].message;
      return { status: 400, error: { message: err, error: new Error(err) } };
    }

    // populate references
    let rf = await Public.populateReferences(config, objInfo, _ctx);
    if (rf.error) {
      return rf;
    }

    // put
    const projection = Utils.getSubscribersProjection(config.subscribers, _ctx);
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

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

    // raise a sync notification
    let rn = await Utils.raiseNotification(config, Constants.Notification.Modified, r.value, _ctx);

    return r;
  },

  /**
   * patch
   * config: { serviceName, collection, schema, references, fillReferences, events, subscribers }
   * patchInfo: { set, unset, add, remove }
   * returns: { status, value } or { status, error }
   */
  patch: async (config, objID, patchInfo, _ctx) => {
    // validate
    const v = config.schema.validate(patchInfo);
    if (v.error) {
      const err = v.error.details[0].message;
      return { status: 400, error: { message: err, error: new Error(err) } };
    }

    // populate references
    let rf = await Public.populateReferences(config, patchInfo.set, _ctx);
    if (rf.error) {
      return rf;
    }

    let rfa = await Public.populateReferences(config, patchInfo.add, _ctx);
    if (rfa.error) {
      return rfa;
    }

    const projection = Utils.getSubscribersProjection(config.subscribers, _ctx);
    const r = await DbOpsUtils.patch(config, objID, patchInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

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

    // raise a sync notification
    let rn = await Utils.raiseNotification(config, Constants.Notification.Modified, r.value, _ctx);

    return r;
  },

  /**
   * populate the field by getting the detail info via rest
   * config: {fieldName, service, projection}
   *          fieldName: if empty take data from current object
   */
  populate: async (config, objs, _ctx) => {
    // get all ids first
    let targetsMap = {};
    for (const i in objs) {
      Utils.collectIDs(targetsMap, objs, i, config.fieldName);
    }

    let targetsIDs = Object.keys(targetsMap);
    if (!targetsIDs.length) {
      console.log(`Skipping calling targets to populate info for field ${config.fieldName}`);
      return objs;
    }

    // get all targets
    const projection = config.projection || { id: 1, name: 1, type: 1, status: 1 };
    let rs = await config.service.getAllByIDs(targetsIDs, projection, _ctx);
    if (rs.error) {
      return rs;
    }

    if (targetsIDs.length != rs.value.length) {
      console.log(`Not all targets were found for field ${config.fieldName}`);
    }

    targetsMap = {};
    for (const obj of rs.value) {
      targetsMap[obj.id] = obj;
    }

    // update info
    for (let i in objs) {
      Utils.populate(targetsMap, objs, i, config.fieldName);
    }

    console.log(`Targets expanded for field ${config.fieldName}`);

    return objs;
  },

  /**
   * populate references
   * config: { ..., fillReferences, references: [ {fieldName, service, projection} ] }
   */
  populateReferences: async (config, objs, _ctx) => {
    if (!config.fillReferences) {
      return { status: 200, value: null }; // skipped
    }

    if (!objs) {
      return { status: 200, value: null }; // skipped
    }

    if (!Array.isArray(objs)) {
      objs = [objs];
    }

    for (const configRef of config.references) {
      let r = await Public.populate(configRef, objs, _ctx);
      if (r.error) {
        return r;
      }
    }

    return { status: 200, value: true }; // success
  },

  /**
   * internal sync notification
   * config: { serviceName, collection, schema, references, fillReferences, events, subscribers }
   * notification: { added: [ { id, ... } ], removed, modified  }
   * returns: { status, value } or { status, error }
   */
  notification: async (config, notification, _ctx) => {
    if (!config.fillReferences) {
      return { status: 200, value: null }; // skipped
    }

    // validate
    const v = Schema.Notification.validate(notification);
    if (v.error) {
      const err = v.error.details[0].message;
      return { status: 400, error: { message: err, error: new Error(err) } };
    }

    // configRef: { fieldName, service, projection }
    for (const configRef of config.references) {
      if (configRef.service?.Constants?.ServiceName !== notification.serviceName) {
        console.log(`${config.serviceName}: For ${configRef.fieldName} notification is ignored`);
        continue;
      }

      if (notification.modified) {
        console.log(
          `${config.serviceName}: For ${configRef.fieldName} apply changes from notification ${notification}`
        );

        // apply modified changes one by one
        for (const refObj of notification.modified) {
          const rn = await DbOpsUtils.updateManyReferences(config, configRef.fieldName, refObj, _ctx);
          if (rn.error) {
            return rn;
          }
        }
      } else if (notification.removed) {
        console.log(
          `${config.serviceName}: For ${configRef.fieldName} apply deletion from notification ${notification}`
        );

        // apply deleted changes one by one
        for (const refObj of notification.removed) {
          const rn = await DbOpsUtils.deleteManyReferences(config, configRef.fieldName, refObj, _ctx);
          if (rn.error) {
            return rn;
          }
        }
      } else {
        console.log(`${config.serviceName}: For ${configRef.fieldName} skip notification`);
      }
    }

    console.log(`${config.serviceName}: Notification processed succesfully: ${JSON.stringify(notification)}`);

    // success
    return { status: 200, value: true };
  },
};

module.exports = { ...Public, Constants };
