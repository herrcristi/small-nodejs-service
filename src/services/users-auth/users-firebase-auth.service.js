/**
 * Users service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');

const UsersAuthConstants = require('./users-auth.constants.js');

const Private = {
  /**
   * set config for firebase auth
   */
  setupConfig: async (config, _ctx) => {
    return config;
  },
};
const Public = {
  /**
   * init
   */
  init: async () => {},

  /**
   * get all by ids
   * config: { serviceName, collection }
   * returns { status, value } or { status, error }
   */
  getAllByIDs: async (config, ids, projection, _ctx) => {
    await Private.setupConfig(config, _ctx);

    return { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
  },

  /**
   * get one
   * config: { serviceName, collection }
   * returns { status, value } or { status, error }
   */
  getOne: async (config, objID, projection, _ctx) => {
    await Private.setupConfig(config, _ctx);

    return { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
  },

  /**
   * post
   * config: { serviceName, collection, notifications.projection }
   */
  post: async (config, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // post
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * delete
   * config: { serviceName, collection, notifications.projection }
   */
  delete: async (config, objID, _ctx) => {
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * put
   * config: { serviceName, collection, notifications.projection }
   */
  put: async (config, objID, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // put
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * patch
   * config: { serviceName, collection, notifications.projection }
   */
  patch: async (config, objID, patchInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // patch
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },
};

module.exports = {
  ...Public,
  Constants: UsersAuthConstants,
};
