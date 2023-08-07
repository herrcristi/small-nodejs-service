/**
 * Database operation utils
 */
const CommonUtils = require('./common.utils');

const Utils = {
  /**
   * error
   */
  error: (msg, time, _ctx) => {
    return {
      time: new Date() - time /*milliseconds*/,
      status: 500,
      error: { message: msg, error: new Error(msg) },
    };
  },
};

const Public = {
  /**
   * get all
   * config: { serviceName, collection }
   * filter: { filter, projection, limit, skip, sort }
   * return: { status, value } or { status, error: { message, error } }
   */
  getAll: async (config, filter, _ctx) => {
    const time = new Date();

    return Utils.error('Not implemented', time, _ctx);
  },

  getAllCount: async (config, filter, _ctx) => {
    const time = new Date();

    return Utils.error('Not implemented', time, _ctx);
  },

  getAllByIDs: async (config, ids, projection, _ctx) => {
    return Public.getAll(config, { filter: { id: { $in: ids } }, projection }, _ctx);
  },

  /**
   * get one
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  getOne: async (config, objID, projection, _ctx) => {
    const time = new Date();

    // 200, 404
    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * post
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  post: async (config, objInfo, _ctx) => {
    const time = new Date();

    objInfo.id = objInfo.id || CommonUtils.uuidc();
    objInfo.createdTimestamp = new Date();
    objInfo.lastModifiedTimestamp = objInfo.createdTimestamp;

    // 201
    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * delete
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  delete: async (config, objID, projection, _ctx) => {
    const time = new Date();

    // 200, 404
    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * put
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  put: async (config, objID, objInfo, projection, _ctx) => {
    const time = new Date();
    objInfo.lastModifiedTimestamp = new Date();

    // 200, 404
    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * patch
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  patch: async (config, objID, patchInfo, projection, _ctx) => {
    const time = new Date();
    //patchInfo.set.lastModifiedTimestamp = new Date();

    // 200, 404
    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * references update many
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  updateManyReferences: async (config, fieldName, objInfo, _ctx) => {
    const time = new Date();
    //set.lastModifiedTimestamp = new Date();

    let filterField = fieldName ? `${fieldName}.id` : `id`;
    // filterField === objInfo.id -> set fieldName.field = objInfo.field

    // 200, 404
    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * references delete many
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  deleteManyReferences: async (config, fieldName, objInfo, _ctx) => {
    const time = new Date();
    //set.lastModifiedTimestamp = new Date();

    let filterField = fieldName ? `${fieldName}.id` : `id`;
    // filterField === objInfo.id -> set fieldName.field = objInfo.field

    // 200, 404
    return Utils.error('Not implemented', time, _ctx);
  },
};

module.exports = { ...Public };
