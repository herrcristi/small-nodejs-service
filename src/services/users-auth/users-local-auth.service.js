/**
 * Users service
 */
const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const JwtUtils = require('../../core/utils/jwt.utils.js');

const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthDatabase = require('./users-local-auth.database.js');

const Private = {
  Issuer: `${UsersAuthConstants.ServiceName}-local`,

  // will be initialized on init
  SiteSalt: null,

  /**
   * set config for local auth
   * returns { serviceName, collection, notifications.projection }
   */
  setupConfig: async (config, _ctx) => {
    config.collection = await UsersAuthDatabase.collection(_ctx);
    config.notifications = {
      projection: { id: 1, type: 1, userID: 1 } /* for sync+async */,
    };
    return config;
  },

  /**
   * generate salt
   */
  genSalt: () => {
    return CommonUtils.getRandomBytes(32);
  },

  /**
   * hash a password
   */
  hashPassword: (password, salt, _ctx) => {
    // hash password using user salt
    let hash = CommonUtils.getHash(password, salt);

    // hash password again using site salt
    hash = CommonUtils.getHash(hash, Private.SiteSalt);

    return hash;
  },
};

const Public = {
  /**
   * init
   */
  init: async () => {
    Private.SiteSalt = process.env.SALT;
    await JwtUtils.init(Private.Issuer);
  },

  /**
   * login
   * config: { serviceName }
   * objInfo: { id, password }
   */
  login: async (config, objInfo, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // get one
    const passProjection = { ...projection, password: 1, salt: 1 };
    const r = await DbOpsUtils.getOne(config, objInfo.id, passProjection, _ctx);
    if (r.error) {
      return r;
    }

    // check password
    const currValue = r.value;
    objInfo.password = Private.hashPassword(objInfo.password, currValue.salt, _ctx);
    if (objInfo.password !== currValue.password) {
      const errorLogin = 'Invalid username/password';
      return { status: 401, error: { message: errorLogin, error: new Error(errorLogin) } };
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * logout
   * config: { serviceName }
   */
  logout: async (config, _ctx) => {
    return { success: true, value: true };
  },

  /**
   * get the jwt token
   * config: { serviceName }
   * userInfo: { id, userID } // id is the username/email
   */
  getToken: async (config, userInfo, _ctx) => {
    return JwtUtils.getJwt({ ...userInfo, creatingTimestamp: new Date().toISOString() }, Private.Issuer, _ctx);
  },

  /**
   * validate the token
   * config: { serviceName }
   * objInfo: { token }
   */
  validateToken: async (config, objInfo, _ctx) => {
    return JwtUtils.validateJwt(objInfo.token, Private.Issuer, _ctx);
  },

  /**
   * post
   * config: { serviceName }
   * objInfo: { id, password }
   */
  post: async (config, objInfo, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // hash password
    objInfo.salt = Private.genSalt();
    objInfo.password = Private.hashPassword(objInfo.password, objInfo.salt, _ctx);

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
   * config: { serviceName }
   */
  delete: async (config, objID, _ctx) => {
    // { serviceName, collection, notifications.projection }
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
   * config: { serviceName }
   * objInfo: { password }
   */
  put: async (config, objID, objInfo, _ctx) => {
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // hash password with new salt
    objInfo.salt = Private.genSalt();
    objInfo.password = Private.hashPassword(objInfo.password, objInfo.salt, _ctx);

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
   * config: { serviceName }
   * patchInfo: { set: { salt, password } }
   */
  patch: async (config, objID, patchInfo, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // hash password with new salt
    patchInfo.set.salt = Private.genSalt();
    patchInfo.set.password = Private.hashPassword(patchInfo.set.password, patchInfo.set.salt, _ctx);

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
