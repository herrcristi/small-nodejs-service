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
      error: { message: msg, error: new Error(msg) },
    };
  },
};

const Public = {
  /**
   * get all
   * filter: { filter, projection, limit, skip, sort }
   * return: { error: { message, error } } or { value }
   */
  getAll: async (filter, _ctx) => {
    const time = new Date();

    return Utils.error('Not implemented', time, _ctx);
  },

  getAllCount: async (filter, _ctx) => {
    const time = new Date();

    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * get one
   * return: { error: { message, error } } or { value }
   */
  getOne: async (objID, projection, _ctx) => {
    const time = new Date();
    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * post
   * return: { error: { message, error } } or { value }
   */
  post: async (objInfo, _ctx) => {
    const time = new Date();

    objInfo.id = objInfo.id || CommonUtils.uuidc();
    objInfo.createdTimestamp = new Date();
    objInfo.lastModifiedTimestamp = objInfo.createdTimestamp;

    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * delete
   * return: { error: { message, error } } or { value }
   */
  delete: async (objID, projection, _ctx) => {
    const time = new Date();

    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * put
   * return: { error: { message, error } } or { value }
   */
  put: async (objID, objInfo, projection, _ctx) => {
    const time = new Date();
    objInfo.lastModifiedTimestamp = new Date();

    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * patch
   * return: { error: { message, error } } or { value }
   */
  patch: async (objID, patchInfo, projection, _ctx) => {
    const time = new Date();
    //patchInfo.set.lastModifiedTimestamp = new Date();
    return Utils.error('Not implemented', time, _ctx);
  },
};

module.exports = { ...Public };
