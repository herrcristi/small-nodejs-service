/**
 * Users service
 */
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');

const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthDatabase = require('./users-local-auth.database.js');

const Private = {
  // will be initialized on init
  SiteSalt: null,
  JwtPasswords: [], // passwords to sign the jwt, (keep last 2 due to rotation)

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
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * hash a password
   */
  hashPassword: (password, salt, _ctx) => {
    let hash = crypto.scryptSync(password, salt, 64);
    hash = hash.toString('hex');

    hash = crypto.scryptSync(hash, Private.SiteSalt, 64);
    hash = hash.toString('hex');
    return hash;
  },

  /**
   * rotate jwt passwords
   */
  rotateJwtPassords: () => {
    console.log(`Generating a new jwt password`);

    Private.JwtPasswords.push(Private.genSalt()); // add a random password
    Private.JwtPasswords = Private.JwtPasswords.slice(-2); // keep only last 2
  },
};

const Public = {
  /**
   * init
   */
  init: async () => {
    Private.SiteSalt = process.env.SALT;
    Private.rotateJwtPassords();

    setInterval(() => {
      Private.rotateJwtPassords(); // rotate passwords every day, interval must be greater than or equal to jwt expiration
    }, 24 * 60 * 60 * 1000);
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
   * get the jwt token
   * config: { serviceName }
   * userInfo: { id, userID } // id is the username/email
   */
  getToken: async (config, userInfo, _ctx) => {
    const token = jwt.sign(
      {
        user: userInfo,
      },
      Private.JwtPasswords.at(-1),
      { algorithm: 'HS512', expiresIn: '1d', issuer: 'SmallApp' }
    );

    return { status: 200, value: token };
  },

  /**
   * validate the token
   * config: { serviceName }
   * objInfo: { token }
   */
  validateToken: async (config, objInfo, _ctx) => {
    const passwords = [...Private.JwtPasswords].reverse();

    for (const pass of passwords) {
      try {
        const decodedToken = jwt.verify(objInfo.token, Private.JwtPasswords.at(-1), {
          algorithms: 'HS512',
          issuer: 'SmallApp',
        });

        // decoded token: { user: { id, userID }, iat, exp, iss }

        return { status: 200, value: decodedToken.user };
      } catch (e) {
        console.log(`Failed to verify token: ${e.stack}`);
      }
    }

    const msg = 'Invalid token';
    return { status: 401, error: { message: msg, error: new Error(msg) } };
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
