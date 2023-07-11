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
   */
  getOne: async (objID, _ctx) => {
    const time = new Date();
    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * post
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
   */
  delete: async (objID, _ctx) => {
    const time = new Date();

    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    const time = new Date();
    objInfo.lastModifiedTimestamp = new Date();

    return Utils.error('Not implemented', time, _ctx);
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    const time = new Date();
    //patchInfo.set.lastModifiedTimestamp = new Date();
    return Utils.error('Not implemented', time, _ctx);
  },
};

module.exports = { ...Public };
