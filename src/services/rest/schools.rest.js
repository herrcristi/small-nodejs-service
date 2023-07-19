/**
 * Schools service
 */

const RestCommsUtils = require('../../core/utils/rest-communications.utils.js');

const SchoolsConstants = require('../schools/schools.constants');

const Public = {
  /**
   * get all
   * queryParams should contain `?`
   */
  getAll: async (queryParams, _ctx) => {
    return await RestCommsUtils.getAll(SchoolsConstants.ServiceName, queryParams, _ctx);
  },

  getAllByIDs: async (ids, _ctx) => {
    return await RestCommsUtils.getAllByIDs(SchoolsConstants.ServiceName, ids, _ctx);
  },

  /**
   * get one
   */
  getOne: async (objID, _ctx) => {
    return await RestCommsUtils.getOne(SchoolsConstants.ServiceName, objID, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    return await RestCommsUtils.post(SchoolsConstants.ServiceName, objInfo, _ctx);
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    return await RestCommsUtils.delete(SchoolsConstants.ServiceName, objID, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    return await RestCommsUtils.put(SchoolsConstants.ServiceName, objID, objInfo, _ctx);
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    return await RestCommsUtils.patch(SchoolsConstants.ServiceName, objID, patchInfo, _ctx);
  },
};

module.exports = { ...Public };
