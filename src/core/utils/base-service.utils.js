/**
 * Base service
 */
const Joi = require('joi');

const DbOpsUtils = require('./db-ops.utils.js');
const RestApiUtils = require('./rest-api.utils');
const CommonUtils = require('./common.utils');

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
};

const Public = {
  /**
   * get all for a requst
   * config: { serviceName, collection, schema }
   * req: { query }
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllForReq: async (config, req, _ctx) => {
    // convert query to mongo build filter: { filter, projection, limit, skip, sort }
    const filter = await RestApiUtils.buildMongoFilterFromReq(req, config.schema, _ctx);
    if (filter.error) {
      return { status: 400, error: filter.error };
    }

    // get all
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
   * config: { serviceName, collection, schema }
   * filter: { filter, projection, limit, skip, sort }
   * returns: { status, value } or { status, error }
   */
  getAll: async (config, filter, _ctx) => {
    return await DbOpsUtils.getAll(config, filter, _ctx);
  },

  getAllCount: async (config, filter, _ctx) => {
    return await DbOpsUtils.getAllCount(config, filter, _ctx);
  },

  getAllByIDs: async (config, ids, projection, _ctx) => {
    return await DbOpsUtils.getAllByIDs(config, ids, projection, _ctx);
  },

  /**
   * get one
   * config: { serviceName, collection, schema }
   * returns: { status, value } or { status, error }
   */
  getOne: async (config, objID, projection, _ctx) => {
    return await DbOpsUtils.getOne(config, objID, projection, _ctx);
  },

  /**
   * post
   * config: { serviceName, collection, schema }
   * returns: { status, value } or { status, error }
   */
  post: async (config, objInfo, _ctx) => {
    // validate
    const v = config.schema.validate(objInfo);
    if (v.error) {
      const err = v.error.details[0].message;
      return { status: 400, error: { message: err, error: new Error(err) } };
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

    // TODO raise notification

    // success
    return r;
  },

  /**
   * delete
   * config: { serviceName, collection, schema }
   * returns: { status, value } or { status, error }
   */
  delete: async (config, objID, _ctx) => {
    const projection = { id: 1, name: 1, type: 1, status: 1 };
    const r = await DbOpsUtils.delete(config, objID, projection, _ctx);
    if (r.error) {
      return r;
    }

    // TODO raise notification

    return r;
  },

  /**
   * put
   * config: { serviceName, collection, schema }
   * returns: { status, value } or { status, error }
   */
  put: async (config, objID, objInfo, _ctx) => {
    // validate
    const v = config.schema.validate(objInfo);
    if (v.error) {
      const err = v.error.details[0].message;
      return { status: 400, error: { message: err, error: new Error(err) } };
    }

    // put
    const projection = { id: 1, name: 1, type: 1, status: 1 };
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // TODO raise notification

    return r;
  },

  /**
   * patch
   * config: { serviceName, collection, schema }
   * returns: { status, value } or { status, error }
   */
  patch: async (config, objID, patchInfo, _ctx) => {
    // validate
    const v = config.schema.validate(patchInfo);
    if (v.error) {
      const err = v.error.details[0].message;
      return { status: 400, error: { message: err, error: new Error(err) } };
    }

    const projection = { id: 1, name: 1, type: 1, status: 1 };
    const r = await DbOpsUtils.patch(config, objID, patchInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // TODO raise notification

    return r;
  },

  /**
   * populate the field by getting the detail info via rest
   * config: { serviceName, collection, schema }
   * fieldName: if empty take data from current object
   */
  populate: async (objs, fieldName, serviceRest, _ctx, projection = { id: 1, name: 1, type: 1, status: 1 }) => {
    // get all ids first
    let targetsMap = {};
    for (const i in objs) {
      Utils.collectIDs(targetsMap, objs, i, fieldName);
    }

    let targetsIDs = Object.keys(targetsMap);
    if (!targetsIDs.length) {
      console.log(`Skipping calling targets ${fieldName} to populate info`);
      return objs;
    }

    // get all targets
    let rs = await serviceRest.getAllByIDs(targetsIDs, projection, _ctx);
    if (rs.error) {
      return rs;
    }

    if (targetsIDs.length != rs.value.length) {
      console.log(`Not all targets ${fieldName} were found`);
    }

    targetsMap = {};
    for (const obj of rs.value) {
      targetsMap[obj.id] = obj;
    }

    // update info
    for (let i in objs) {
      Utils.populate(targetsMap, objs, i, fieldName);
    }

    return objs;
  },
};

module.exports = { ...Public };
