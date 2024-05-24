/**
 * Users service
 */

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
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
   * get one
   * config: { serviceName }
   * objInfo: { id, password }
   * returns { status, value } or { status, error }
   */
  login: async (config, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    return { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
  },

  /**
   * logout
   * config: { serviceName }
   */
  logout: async (config, _ctx) => {
    await Private.setupConfig(config, _ctx);

    return { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
  },

  /**
   * get the token
   * config: { serviceName }
   * userInfo: { token }
   */
  getToken: async (config, userInfo, _ctx) => {
    return { status: 200, value: userInfo.token };
  },

  /**
   * validate the token
   * config: { serviceName }
   * objInfo: { token }
   */
  validateToken: async (config, objInfo, _ctx) => {
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    return { status: 200, value: { id: 'email' } };
  },

  /**
   * post
   * config: { serviceName }
   * objInfo: { id, password }
   */
  post: async (config, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    // post
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return { id: objInfo.id };
  },

  /**
   * delete
   * config: { serviceName }
   */
  delete: async (config, objID, _ctx) => {
    await Private.setupConfig(config, _ctx);

    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return { id: objID };
  },

  /**
   * put
   * config: { serviceName }
   * objInfo: { oldPassword, newPassword }
   */
  put: async (config, objID, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    // put
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return { id: objID };
  },

  /**
   * patch
   * config: { serviceName }
   * patchInfo: { set: { password } }
   */
  patch: async (config, objID, patchInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    // patch
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return { id: objID };
  },
};

module.exports = {
  ...Public,
  Constants: UsersAuthConstants,
};
