/**
 * Users auth: the firebase provider (not implemented: every operation answers 500 Not implemented)
 */

const UsersAuthConstants = require('./users-auth.constants.js');

const Private = {
  /**
   * set config for firebase auth
   */
  setupConfig: async (config, _ctx) => {
    return config;
  },

  /**
   * the answer of every operation that is not implemented
   */
  notImplemented: () => {
    const msg = 'Not implemented';
    return { status: 500, error: { message: msg, error: new Error(msg) } };
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

    return Private.notImplemented();
  },

  /**
   * logout
   * config: { serviceName }
   */
  logout: async (config, _ctx) => {
    await Private.setupConfig(config, _ctx);

    return Private.notImplemented();
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
    return Private.notImplemented();
  },

  /**
   * post
   * config: { serviceName }
   * objInfo: { username, password }
   */
  post: async (config, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);
    return Private.notImplemented();
  },

  /**
   * delete
   * config: { serviceName }
   */
  delete: async (config, username, _ctx) => {
    await Private.setupConfig(config, _ctx);
    return Private.notImplemented();
  },

  /**
   * put password
   * config: { serviceName }
   * objInfo: { oldPassword, newPassword }
   */
  putPassword: async (config, username, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);
    return Private.notImplemented();
  },

  /**
   * put (email)
   * config: { serviceName }
   * objInfo: { username, password }
   */
  putID: async (config, username, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);
    return Private.notImplemented();
  },

  /**
   * reset password
   * config: { serviceName }
   */
  resetPassword: async (config, username, resetType, _ctx) => {
    await Private.setupConfig(config, _ctx);
    return Private.notImplemented();
  },

  /**
   * send email
   * config: { serviceName }
   * args: { token, resetType }
   */
  sendEmail: async (config, username, args, _ctx) => {
    await Private.setupConfig(config, _ctx);
    return Private.notImplemented();
  },
};

module.exports = {
  ...Public,
  Constants: UsersAuthConstants,
};
