/**
 * Users Auth Sessions service
 *
 * a record for every session (the cookie) and for every emailed link (reset password, signup), in its own collection
 * - a token carries a random secret (32 bytes); the record keeps only the sha256 of it as its id, so a copy of the
 *   collection opens nothing (and a hash of random bytes can not be reverted)
 * - a record has the user, the purpose and the expiry; it is checked at every use, so a token is valid only while its
 *   record exists and is not expired
 * - a record ends when it is not needed anymore: the logout (that session), the use of a link (once), a newer link (the
 *   earlier links), a password change, a password reset, an email change or a removed account (all the records of the
 *   user); the database removes the expired ones (a TTL index)
 */
const crypto = require('crypto');

const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');

const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthSessionsDatabase = require('./users-auth.sessions.database.js');

const Private = {
  /**
   * config
   * returns { serviceName, collection }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: UsersAuthConstants.SessionsServiceName,
      collection: await UsersAuthSessionsDatabase.collection(_ctx),
    };
    return config;
  },

  /**
   * the id of the record of a secret
   */
  getID: (secret) => {
    return crypto.createHash('sha256').update(`${secret}`).digest('hex');
  },

  /**
   * the error of a session or a link that can not be used anymore
   */
  ended: (purpose) => {
    const isSession = purpose === UsersAuthConstants.TokenPurpose.Session;
    const msg = isSession ? 'The session has ended' : 'The link is not valid anymore';
    return { status: 401, error: { message: msg, error: new Error(msg) } };
  },

  /**
   * the error of a request without a user
   */
  noUser: () => {
    const msg = 'A user is required';
    return { status: 400, error: { message: msg, error: new Error(msg) } };
  },
};

const Public = {
  /**
   * start a session or an emailed link of a user; a new link replaces the earlier links of the user (only the last
   * email can be used)
   * purpose: TokenPurpose.Session or a ResetTokenType
   * user: { userID, username }
   * returns { status, value: { id, secret, expiresAt } } or { status, error }; the secret goes only into the token
   */
  create: async (purpose, user, _ctx) => {
    if (!user?.userID || !user?.username) {
      return Private.noUser();
    }

    const config = await Private.getConfig(_ctx);

    // the earlier links of the user
    if (purpose !== UsersAuthConstants.TokenPurpose.Session) {
      const filter = { userID: user.userID, purpose: { $ne: UsersAuthConstants.TokenPurpose.Session } };
      const rOld = await DbOpsUtils.deleteAll(config, { filter }, _ctx);
      if (rOld.error) {
        return rOld;
      }
    }

    // the record (only the hash of the secret)
    const secret = CommonUtils.getRandomBytes(32).toString('hex');
    const id = Private.getID(secret);
    const expiresIn = UsersAuthConstants.TokenExpiresIn[purpose] * 1000; // ms
    const expiresAt = new Date(Date.now() + expiresIn); // a date, for the TTL index
    const record = { id, purpose, userID: user.userID, username: user.username, expiresAt };

    const r = await DbOpsUtils.post(config, record, _ctx);
    if (r.error) {
      return r;
    }

    return { status: 201, value: { id, secret, expiresAt } };
  },

  /**
   * check the data of a token: its record exists (not ended), is for the same purpose and user, and is not expired (the
   * database removes the expired records only from time to time)
   * tokenData: { purpose, username, secret }
   * returns { status, value: { id, purpose, userID, username, expiresAt } } or { status, error }
   */
  check: async (tokenData, _ctx) => {
    const purpose = tokenData?.purpose;
    if (!tokenData?.secret) {
      return Private.ended(purpose);
    }

    const config = await Private.getConfig(_ctx);

    const id = Private.getID(tokenData.secret);
    const projection = { _id: 0, id: 1, purpose: 1, userID: 1, username: 1, expiresAt: 1 };
    const r = await DbOpsUtils.getOne(config, id, projection, _ctx);
    if (r.status === 404) {
      return Private.ended(purpose);
    }
    if (r.error) {
      return r;
    }

    // the same purpose and user, not expired (an invalid date is expired)
    const record = r.value;
    const isOpen = new Date(record.expiresAt).getTime() > Date.now();
    if (record.purpose !== purpose || record.username !== tokenData.username || !isOpen) {
      return Private.ended(purpose);
    }

    return { status: 200, value: record };
  },

  /**
   * end a session, or use a link: its record is removed once (404 when it was already ended or used, also by a request
   * at the same time)
   * returns { status, value } or { status, error }
   */
  end: async (id, _ctx) => {
    const config = await Private.getConfig(_ctx);

    return await DbOpsUtils.delete(config, id, { _id: 0, id: 1 }, _ctx);
  },

  /**
   * end all the sessions and the links of a user (a password change, a password reset, an email change, a removed
   * account)
   * returns { status, value: count } or { status, error }
   */
  endAll: async (userID, _ctx) => {
    if (!userID) {
      return Private.noUser();
    }

    const config = await Private.getConfig(_ctx);

    return await DbOpsUtils.deleteAll(config, { filter: { userID } }, _ctx);
  },
};

module.exports = {
  ...Public,
  Constants: UsersAuthConstants,
};
