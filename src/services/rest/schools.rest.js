/**
 * Schools service
 */

const CommsUtils = require('../../core/utils/communications.utils');

const SchoolsConstants = require('../schools/schools.constants');

const Public = {
  /**
   * get all
   * filter: { filter, projection, limit, skip, sort }
   */
  getAll: async (filter, _ctx) => {
    return await CommsUtils.getAll(SchoolsConstants.ServiceName, filter, _ctx);
  },

  getAllByIDs: async (ids, _ctx) => {
    return await CommsUtils.getAllByIDs(SchoolsConstants.ServiceName, ids, _ctx);
  },

  /**
   * get one
   */
  getOne: async (objID, _ctx) => {
    return await CommsUtils.getOne(SchoolsConstants.ServiceName, objID, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    return await CommsUtils.post(SchoolsConstants.ServiceName, objInfo, _ctx);
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    return await CommsUtils.delete(SchoolsConstants.ServiceName, objID, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    return await CommsUtils.put(SchoolsConstants.ServiceName, objID, objInfo, _ctx);
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    return await CommsUtils.patch(SchoolsConstants.ServiceName, objID, patchInfo, _ctx);
  },
};

module.exports = { ...Public };
