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
   * objInfo: { username, password }
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
   * userInfo: { token, username }
   */
  getToken: async (config, userInfo, _ctx) => {
    return {
      status: 200,
      value: { token: userInfo.token, data: { username: userInfo.username } },
    };
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

    return { status: 200, value: { username: 'email' } };
  },

  /**
   * post
   * config: { serviceName }
   * objInfo: { username, password }
   */
  post: async (config, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    // post
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return { status: 200, value: { username: objInfo.username } };
  },

  /**
   * delete
   * config: { serviceName }
   */
  delete: async (config, username, _ctx) => {
    await Private.setupConfig(config, _ctx);

    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return { status: 200, value: { username: username } };
  },

  /**
   * put password
   * config: { serviceName }
   * objInfo: { oldPassword, newPassword }
   */
  putPassword: async (config, username, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    // patch
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return { status: 200, value: { username: username } };
  },

  /**
   * put (email)
   * config: { serviceName }
   * objInfo: { username, password }
   */
  putID: async (config, username, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    // patch
    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return { status: 200, value: { username: objInfo.username } };
  },

  /**
   * reset password
   * config: { serviceName }
   */
  resetPassword: async (config, username, _ctx) => {
    await Private.setupConfig(config, _ctx);

    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return { status: 200, value: { username: username } };
  },

  /**
   * send email
   * config: { serviceName }
   * args: { token, resetType }
   */
  sendEmail: async (config, username, args, _ctx) => {
    await Private.setupConfig(config, _ctx);

    const r = { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    if (r.error) {
      return r;
    }

    // success
    return { status: 200, value: { username: username } };
  },
};

module.exports = {
  ...Public,
  Constants: UsersAuthConstants,
};
