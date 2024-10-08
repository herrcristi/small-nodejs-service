/**
 * Users service
 */
const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const JwtUtils = require('../../core/utils/jwt.utils.js');
const TranslationsUtils = require('../../core/utils/translations.utils.js');

const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthDatabase = require('./users-local-auth.database.js');
const EmailsUtils = require('../../core/utils/emails.utils.js');

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
    return CommonUtils.getRandomBytes(32).toString('hex');
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
    // (due to multipod env password must be the same for all pods)
    // allow rotation of password by providing mutiple password to support old tokens
    await JwtUtils.init(Private.Issuer, [process.env.PREVAUTHPASS, process.env.AUTHPASS]);
    await EmailsUtils.init(process.env.SMTP_CONFIG);
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
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // check if equal
    if (objInfo.oldPassword === objInfo.newPassword) {
      const msg = 'New password is the same as old password';
      return { status: 400, error: { message: msg, error: new Error(msg) } };
    }

    // check old password
    const rCheck = await Public.login(config, { id: objID, password: objInfo.oldPassword }, _ctx);
    if (rCheck.error) {
      return rCheck;
    }

    // hash password with new salt
    const newSalt = Private.genSalt();
    const passwordPut = {
      salt: newSalt,
      password: Private.hashPassword(objInfo.newPassword, newSalt, _ctx),
    };

    // put
    const r = await DbOpsUtils.put(config, objID, passwordPut, projection, _ctx);
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * put id (email)
   * config: { serviceName }
   *  objInfo: { id, password }
   */
  putID: async (config, objID, objInfo, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // check if equal
    if (_ctx.username === objInfo.id) {
      const msg = 'New id email is the same as current one';
      return { status: 400, error: { message: msg, error: new Error(msg) } };
    }

    // check old password
    const rCheck = await Public.login(config, { id: objID, password: objInfo.password }, _ctx);
    if (rCheck.error) {
      return rCheck;
    }

    // remove password
    const idPutInfo = { id: objInfo.id };

    // put
    const r = await DbOpsUtils.put(config, objID, idPutInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * reset password
   * config: { serviceName }
   */
  resetPassword: async (config, objID, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // check user exists
    const r = await DbOpsUtils.getOne(config, objID, { ...projection, userID: 1 }, _ctx);
    if (r.error) {
      return r;
    }

    // create reset token
    const userInfo = { id: r.value.id, userID: r.value.userID };
    return Public.getToken(config, userInfo, _ctx);
  },

  /**
   * check reset token is valid
   * config: { serviceName }
   * objInfo: { token }
   */
  validateResetToken: async (config, objInfo, _ctx) => {
    return Public.validateToken(config, objInfo, _ctx);
  },

  /**
   * check reset token is valid
   * config: { serviceName }
   * objInfo: { password }
   */
  putResetPassword: async (config, objID, objInfo, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // hash password with new salt
    const newSalt = Private.genSalt();
    const passwordPut = {
      salt: newSalt,
      password: Private.hashPassword(objInfo.password, newSalt, _ctx),
    };

    // put
    const r = await DbOpsUtils.put(config, objID, passwordPut, projection, _ctx);
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * send email
   * config: { serviceName }
   * args: { token, resetType }
   */
  sendEmail: async (config, objID, args, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    let emailArgs = {
      user: '',
      school: _ctx.tenantName || _ctx.tenantID,
      appUrl: `${process.env.APP_URL}`,
    };

    if (args.resetType != null) {
      emailArgs.resetUrl = `${process.env.APP_URL}/api/v1/users-auth/reset-token/validate?&type=${args.resetType}&token=${args.token}`;
    }

    let emailTemplate = TranslationsUtils.email(args.emailID, _ctx, emailArgs);

    // send email
    /* no await */ EmailsUtils.sendEmail(objID, emailTemplate['en'].subject, emailTemplate['en'].email, _ctx);
  },
};

module.exports = {
  ...Public,
  Constants: UsersAuthConstants,
};
