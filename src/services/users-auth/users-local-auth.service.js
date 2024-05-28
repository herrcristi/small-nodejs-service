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
    const currHashValue = r.value.password;
    const checkHashValue = Private.hashPassword(objInfo.password, r.value.salt, _ctx);
    if (checkHashValue !== currHashValue) {
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
    return { status: 200, success: true, value: true };
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
   * put password
   * config: { serviceName }
   * objInfo: { oldPassword, newPassword }
   */
  putPassword: async (config, objID, objInfo, _ctx) => {
    return await Public.patchPassword(config, objID, { set: objInfo }, _ctx);
  },

  /**
   * put id (email)
   * config: { serviceName }
   *  objInfo: { id, password }
   */
  putID: async (config, objID, objInfo, _ctx) => {
    return await Public.patchID(config, objID, { set: objInfo }, _ctx);
  },

  /**
   * patch password
   * config: { serviceName }
   * patchInfo: { set: { newPassword, oldPassword } }
   */
  patchPassword: async (config, objID, patchInfo, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // check if equal
    if (patchInfo.set.oldPassword === patchInfo.set.newPassword) {
      const msg = 'New password is the same as old password';
      return { status: 400, error: { message: msg, error: new Error(msg) } };
    }

    // check old password
    const rCheck = await Public.login(config, { id: objID, password: patchInfo.set.oldPassword }, _ctx);
    if (rCheck.error) {
      return rCheck;
    }

    // hash password with new salt
    patchInfo.set.salt = Private.genSalt();
    patchInfo.set.password = Private.hashPassword(patchInfo.set.newPassword, patchInfo.set.salt, _ctx);

    // patch
    const r = await DbOpsUtils.patch(config, objID, patchInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * patch id (email)
   * config: { serviceName }
   * patchInfo: { set: { id, password } }
   */
  patchID: async (config, objID, patchInfo, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // check if equal
    if (_ctx.username === patchInfo.set.id) {
      const msg = 'New id email is the same as current one';
      return { status: 400, error: { message: msg, error: new Error(msg) } };
    }

    // check old password
    const rCheck = await Public.login(config, { id: objID, password: patchInfo.set.password }, _ctx);
    if (rCheck.error) {
      return rCheck;
    }

    // remove password
    const idPatchInfo = { set: { id: patchInfo.set.id } };

    // patch
    const r = await DbOpsUtils.patch(config, objID, idPatchInfo, projection, _ctx);
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
