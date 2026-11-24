/**
 * Users service
 */
const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DatabaseManagerUtils = require('../../core/utils/database-manager.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const crypto = require('crypto');

const CommonUtils = require('../../core/utils/common.utils.js');
const JwtUtils = require('../../core/utils/jwt.utils.js');
const TranslationsUtils = require('../../core/utils/translations.utils.js');

const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthDatabase = require('./users-local-auth.database.js');
const UsersAuthSessionsService = require('./users-auth.sessions.service.js');
const EmailsUtils = require('../../core/utils/emails.utils.js');

const Private = {
  Issuer: `${UsersAuthConstants.ServiceName}-local`,

  // will be initialized on init
  SiteSalt: null,

  /**
   * set config for local auth
   * returns { serviceName, collection, maxTimeMS, notifications.projection }
   */
  setupConfig: async (config, _ctx) => {
    config.collection = await UsersAuthDatabase.collection(_ctx);
    config.maxTimeMS = DatabaseManagerUtils.getMaxTimeMS(); // the time limit of each database call (DbOpsUtils)
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
   * a salt for the accounts that do not exist: the login does the same work, so its time does not tell if an account
   * exists
   */
  DummySalt: CommonUtils.getRandomBytes(32).toString('hex'),

  /**
   * compare two hashes in a constant time
   */
  equalHashes: (hash1, hash2) => {
    const buffer1 = Buffer.from(`${hash1}`);
    const buffer2 = Buffer.from(`${hash2}`);
    return buffer1.length === buffer2.length && crypto.timingSafeEqual(buffer1, buffer2);
  },

  /**
   * the error of a token that can not be used
   */
  invalidToken: (msg) => {
    return { status: 401, error: { message: msg, error: new Error(msg) } };
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
    Private.SiteSalt = process.env.SMALL_API_SALT;
    // (due to multipod env password must be the same for all pods)
    // allow rotation of password by providing mutiple password to support old tokens
    await JwtUtils.init(Private.Issuer, [process.env.SMALL_API_PREVAUTHPASS, process.env.SMALL_API_AUTHPASS]);
    await EmailsUtils.init(process.env.SMALL_API_SMTP_CONFIG);
  },

  /**
   * login
   * config: { serviceName }
   * objInfo: { username, password }
   */
  login: async (config, objInfo, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // get one (read on the primary: a password set or changed by the request before decides the login)
    const passProjection = { ...projection, password: 1, salt: 1 };
    const options = { readPreference: DbOpsUtils.Constants.ReadPrimary };
    const r = await DbOpsUtils.getOne(config, objInfo.username /*id*/, passProjection, _ctx, options);
    if (r.error) {
      // the same work as for an existing account (the time of the answer does not tell if the account exists)
      Private.hashPassword(objInfo.password, Private.DummySalt, _ctx);
      return r;
    }

    // check password
    const currHashValue = r.value.password;
    const checkHashValue = Private.hashPassword(objInfo.password, r.value.salt, _ctx);
    if (!Private.equalHashes(checkHashValue, currHashValue)) {
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
    // nothing to end here: the session is ended by the sessions service
    return { status: 200, success: true, value: true };
  },

  /**
   * get the session token (the cookie): it carries the secret of the session (its record is checked at every request)
   * config: { serviceName }
   * userInfo: { username, userID, secret }
   */
  getToken: async (config, userInfo, _ctx) => {
    const data = {
      purpose: UsersAuthConstants.TokenPurpose.Session,
      username: userInfo.username,
      userID: userInfo.userID,
      secret: userInfo.secret,
      creatingTimestamp: new Date().toISOString(),
    };
    const expiresIn = UsersAuthConstants.TokenExpiresIn.session;
    return JwtUtils.getJwt(data, Private.Issuer, _ctx, expiresIn);
  },

  /**
   * validate a session token: a valid jwt made for a session (a reset token is not a session)
   * config: { serviceName }
   * objInfo: { token }
   */
  validateToken: async (config, objInfo, _ctx) => {
    const r = JwtUtils.validateJwt(objInfo.token, Private.Issuer, _ctx);
    if (r.error) {
      return r;
    }
    if (r.value.purpose !== UsersAuthConstants.TokenPurpose.Session) {
      return Private.invalidToken('Not a session token');
    }
    return r;
  },

  /**
   * get the auth record of a user (without the password): it exists, or 404
   * config: { serviceName }
   * options: { readPreference? } the options of the read (DbOpsUtils.getOne)
   */
  getOne: async (config, username, _ctx, options) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    return await DbOpsUtils.getOne(config, username /*id*/, { _id: 0, id: 1, userID: 1 }, _ctx, options);
  },

  /**
   * post
   * config: { serviceName }
   * objInfo: { username, password, userID }
   */
  post: async (config, objInfo, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // hash password
    const salt = Private.genSalt();
    objInfo.password = Private.hashPassword(objInfo.password, salt, _ctx);

    // post
    const r = await DbOpsUtils.post(
      config,
      { id: objInfo.username, password: objInfo.password, userID: objInfo.userID, salt },
      _ctx
    );
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
  delete: async (config, username, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.delete(config, username /*id*/, projection, _ctx);
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
  putPassword: async (config, username, objInfo, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // check if equal
    if (objInfo.oldPassword === objInfo.newPassword) {
      const msg = 'New password is the same as old password';
      return { status: 400, error: { message: msg, error: new Error(msg) } };
    }

    // check old password
    const rCheck = await Public.login(config, { username, password: objInfo.oldPassword }, _ctx);
    if (rCheck.error) {
      return rCheck;
    }

    // hash password with new salt
    const newSalt = Private.genSalt();
    const newPassword = Private.hashPassword(objInfo.newPassword, newSalt, _ctx);
    const passwordPut = { salt: newSalt, password: newPassword };

    // put
    const r = await DbOpsUtils.put(config, username /*id*/, passwordPut, projection, _ctx);
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * put id (email)
   * config: { serviceName }
   * objInfo: { username, password }
   */
  putID: async (config, username, objInfo, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // check if equal
    if (username === objInfo.username) {
      const msg = 'New username is the same as current one';
      return { status: 400, error: { message: msg, error: new Error(msg) } };
    }

    // check old password
    const rCheck = await Public.login(config, { username, password: objInfo.password }, _ctx);
    if (rCheck.error) {
      return rCheck;
    }

    // put new id
    const newIdPutInfo = { id: objInfo.username };
    const r = await DbOpsUtils.put(config, username /*id*/, newIdPutInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * reset password: a link (a token) to set the password
   * config: { serviceName }
   * account: { username, userID } of the auth record when the caller has just written or found it (the invite): it is
   *   not read again; never from a request
   */
  resetPassword: async (config, username, resetType, _ctx, account) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    // the user of the link: the account of the caller (written or found by the invite in the same request: it is not
    // read again), otherwise its auth record is read (the public form: check user exists)
    let user = account;
    if (!user) {
      const r = await Public.getOne(config, username, _ctx);
      if (r.error) {
        return r;
      }
      user = { userID: r.value.userID, username: r.value.id };
    }

    // the record of the link: used once, replaced by a newer link, ended by a password change
    const rLink = await UsersAuthSessionsService.create(resetType, user, _ctx);
    if (rLink.error) {
      return rLink;
    }

    // create the reset token: for this purpose only, short lived, with the secret of its record
    const data = {
      purpose: resetType,
      username: user.username,
      userID: user.userID,
      secret: rLink.value.secret,
    };
    const expiresIn = UsersAuthConstants.TokenExpiresIn[resetType];
    return JwtUtils.getJwt(data, Private.Issuer, _ctx, expiresIn);
  },

  /**
   * put the time of an email of a type sent to a user (emailTimestamps.<type> of its auth record), only when the last
   * one is older than EmailInterval seconds: at most one each interval, in one database call, so it holds with several
   * processes
   * returns { status: 200, value } when it can be sent now, 409 when one was sent less than EmailInterval ago, 404
   * when the user has no auth record, or { status, error }
   */
  putEmailTimestamp: async (config, username, emailType, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const field = `emailTimestamps.${emailType}`;
    const now = new Date();
    const sentBefore = new Date(now.getTime() - UsersAuthConstants.EmailInterval * 1000).toISOString();
    const options = { filter: { $or: [{ [field]: { $exists: false } }, { [field]: { $lt: sentBefore } }] } };
    const projection = { _id: 0, id: 1 };
    return await DbOpsUtils.put(config, username, { [field]: now.toISOString() }, projection, _ctx, options);
  },

  /**
   * check reset token is valid: a valid jwt made for a reset (not a session), and its link is still valid (not used,
   * not replaced by a newer link, not ended by a password change)
   * config: { serviceName }
   * objInfo: { token }
   * returns { status, value: { purpose, username, userID, linkID } } or { status, error }
   */
  validateResetToken: async (config, objInfo, _ctx) => {
    // validate jwt
    const r = JwtUtils.validateJwt(objInfo.token, Private.Issuer, _ctx);
    if (r.error) {
      return r;
    }

    // check purpose is a reset type
    const resetTypes = Object.values(UsersAuthConstants.ResetTokenType);
    if (!resetTypes.includes(r.value.purpose)) {
      return Private.invalidToken('Not a reset token');
    }

    // check the record of the link
    const rLink = await UsersAuthSessionsService.check(r.value, _ctx);
    if (rLink.error) {
      return rLink;
    }

    // success (the id of the record, to use the link)
    const value = { purpose: r.value.purpose, username: r.value.username, userID: r.value.userID };
    return { status: 200, value: { ...value, linkID: rLink.value.id } };
  },

  /**
   * check reset token is valid
   * config: { serviceName }
   * objInfo: { password }
   */
  putResetPassword: async (config, username, objInfo, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // hash password with new salt
    const newSalt = Private.genSalt();
    const newPassword = Private.hashPassword(objInfo.password, newSalt, _ctx);
    const passwordPut = { salt: newSalt, password: newPassword };

    // put
    const r = await DbOpsUtils.put(config, username /*id*/, passwordPut, projection, _ctx);
    if (r.error) {
      return r;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, projection, _ctx);
  },

  /**
   * send email
   * config: { serviceName }
   * args: { token, resetType, emailType }
   * returns { status, value } or { status, error } (the email could not be delivered to the mail server)
   */
  sendEmail: async (config, username, args, _ctx) => {
    // { serviceName, collection, notifications.projection }
    await Private.setupConfig(config, _ctx);

    const uiUrl = process.env.SMALL_UI_URL;
    let emailArgs = {
      user: username, // the email of the recipient ("Hi {user}")
      school: _ctx.tenantName || _ctx.tenantID,
      appUrl: uiUrl,
    };

    // the link opens the page of the UI that sets the password; the token is in the fragment (after #), which the
    // browser never sends to a server, so it is not in the logs or the history of a server
    if (args.resetType != null) {
      const type = encodeURIComponent(args.resetType);
      const token = encodeURIComponent(args.token);
      emailArgs.resetUrl = `${uiUrl}/reset-password#type=${type}&token=${token}`;
    }

    let emailTemplate = TranslationsUtils.email(args.emailType, _ctx, emailArgs);

    // send email (the result tells if it was delivered to the mail server)
    return await EmailsUtils.sendEmail(username, emailTemplate['en'].subject, emailTemplate['en'].email, _ctx);
  },
};

module.exports = {
  ...Public,
  Constants: UsersAuthConstants,
};
