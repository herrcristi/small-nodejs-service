/**
 * Users service
 */

const DbOpsUtils = require('../../core/utils/db-ops.utils');

const UserConstants = require('./users.constants');

const Public = {
  /**
   * get all
   * filter: { filter, projection, limit, skip, sort }
   */
  getAll: async (filter, _ctx) => {
    return await DbOpsUtils.getAll(filter, _ctx);
  },

  /**
   * get one
   */
  getOne: async (objID, _ctx) => {
    return await DbOpsUtils.getOne(objID, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    const r = await DbOpsUtils.post(objInfo, _ctx);
    if (r.error) {
      return r;
    }

    // TODO raise notification

    return r;
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    const r = await DbOpsUtils.delete(objID, _ctx);
    if (r.error) {
      return r;
    }

    if (r.value) {
      // TODO raise notification
    }

    return r;
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    const r = await DbOpsUtils.put(objID, objInfo, _ctx);
    if (r.error) {
      return r;
    }

    if (r.value) {
      // TODO raise notification
    }

    return r;
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    const r = await DbOpsUtils.patch(objID, patchInfo, _ctx);
    if (r.error) {
      return r;
    }

    if (r.value) {
      // TODO raise notification
    }

    return r;
  },
};

module.exports = { ...Public };
