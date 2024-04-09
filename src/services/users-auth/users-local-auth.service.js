/**
 * Users service
 */

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');

const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthDatabase = require('./users-local-auth.database.js');

const Private = {
  /**
   * set config for local auth
   * returns { serviceName, collection, schema, references, fillReferences, events }
   */
  setupConfig: async (config, _ctx) => {
    config.collection = await UsersAuthDatabase.collection(_ctx);
    return config;
  },
};

const Public = {
  /**
   * init
   */
  init: async () => {},

  /**
   * get one
   * config: { serviceName, collection }
   * returns { status, value } or { status, error }
   */
  getOne: async (config, objID, projection, _ctx) => {
    await Private.setupConfig(config, _ctx);

    return await DbOpsUtils.getOne(config, objID, projection, _ctx);
  },

  /**
   * post
   * config: { serviceName, collection, notifications.projection }
   * objInfo: { id, salt, password }
   */
  post: async (config, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // post
    const r = await DbOpsUtils.post(config, objInfo, _ctx);
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
    const r = await DbOpsUtils.delete(config, objID, projection, _ctx);
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * put
   * config: { serviceName, collection, notifications.projection }
   * objInfo: { salt, password }
   */
  put: async (config, objID, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // put
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * patch
   * config: { serviceName, collection, notifications.projection }
   * patchInfo: { set: { salt, password } }
   */
  patch: async (config, objID, patchInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // patch
    const r = await DbOpsUtils.patch(config, objID, patchInfo, projection, _ctx);
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
