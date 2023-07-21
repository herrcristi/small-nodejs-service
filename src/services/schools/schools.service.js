/**
 * Schools service
 */

const DbOpsUtils = require('../../core/utils/db-ops.utils');

const SchoolsConstants = require('./schools.constants');

const Public = {
  /**
   * get all
   * filter: { filter, projection, limit, skip, sort }
   */
  getAll: async (filter, _ctx) => {
    return await DbOpsUtils.getAll(filter, _ctx);
  },

  getAllCount: async (filter, _ctx) => {
    return await DbOpsUtils.getAllCount(filter, _ctx);
  },

  getAllByIDs: async (ids, projection, _ctx) => {
    return await DbOpsUtils.getAllByIDs(ids, projection, _ctx);
  },

  /**
   * get one
   */
  getOne: async (objID, _ctx) => {
    return await DbOpsUtils.getOne(objID, null /* projection */, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    // add default status if not set
    objInfo.status = objInfo.status || SchoolsConstants.Status.Pending;
    objInfo.type = SchoolsConstants.Type;

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
    const projection = { id: 1, name: 1, type: 1, status: 1 };
    const r = await DbOpsUtils.delete(objID, projection, _ctx);
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
    const projection = { id: 1, name: 1, type: 1, status: 1 };
    const r = await DbOpsUtils.put(objID, objInfo, projection, _ctx);
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
    const projection = { id: 1, name: 1, type: 1, status: 1 };
    const r = await DbOpsUtils.patch(objID, patchInfo, projection, _ctx);
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
