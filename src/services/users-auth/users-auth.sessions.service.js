/**
 * Users Auth Sessions service
 *
 * a record for every session (the cookie) and for every emailed link (reset password, signup), in its own collection
 * - a token carries a random secret (32 bytes); the record keeps only the sha256 of it as its id, so a copy of the
 *   collection opens nothing (and a hash of random bytes can not be reverted)
 * - a record has the user, the purpose and the expiry; it is checked at every use, so a token is valid only while its
 *   record exists and is not expired
 * - a session also ends after a time without requests (SessionLimits.IdleTimeout; its last use is saved at most every
 *   SessionLimits.TouchInterval), and a user has at most SessionLimits.MaxPerUser open sessions (a new login ends the
 *   oldest ones)
 * - a record ends when it is not needed anymore: the logout (that session), the use of a link (once), a newer link (the
 *   earlier links), a password change, a password reset, an email change or a removed account (all the records of the
 *   user); the database removes the expired ones (a TTL index)
 */
const crypto = require('crypto');

const DatabaseManagerUtils = require('../../core/utils/database-manager.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');

const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthSessionsDatabase = require('./users-auth.sessions.database.js');

const Private = {
  /**
   * config
   * returns { serviceName, collection, maxTimeMS }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: UsersAuthConstants.SessionsServiceName,
      collection: await UsersAuthSessionsDatabase.collection(_ctx),
      maxTimeMS: DatabaseManagerUtils.getMaxTimeMS(), // the time limit of each database call (DbOpsUtils)
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
   * keep only the newest open sessions of a user (SessionLimits.MaxPerUser): end the older ones
   * newSessionID: the session just written by the same request (known from its write, not read again): it is kept and
   * takes one of the places, the earlier sessions are read
   * returns { status, value: ended count } or { status, error }
   */
  limitSessions: async (config, userID, newSessionID, _ctx) => {
    // the earlier sessions after the newest ones (the new session is one of the sessions kept)
    const filter = {
      filter: { userID, purpose: UsersAuthConstants.TokenPurpose.Session, id: { $ne: newSessionID } },
      projection: { _id: 0, id: 1 },
      sort: { createdTimestamp: -1 },
      skip: UsersAuthConstants.SessionLimits.MaxPerUser - 1,
    };
    const rOld = await DbOpsUtils.getAll(config, filter, _ctx);
    if (rOld.error) {
      return rOld;
    }
    if (rOld.value.length === 0) {
      return { status: 200, value: 0 };
    }

    // end them
    const ids = rOld.value.map((item) => item.id);
    return await DbOpsUtils.deleteAll(config, { filter: { id: { $in: ids } } }, _ctx);
  },

  /**
   * a session that is used: it ends after a time without requests, otherwise its last use is saved (at most every
   * TouchInterval, so most requests do not write)
   * returns { status, value: record } or { status, error }
   */
  useSession: async (config, record, _ctx) => {
    const { IdleTimeout, TouchInterval } = UsersAuthConstants.SessionLimits;
    const now = Date.now();
    const lastUsed = new Date(record.lastUsedAt).getTime();

    // idle for too long (an invalid date is idle)
    const isActive = lastUsed + IdleTimeout * 1000 > now;
    if (!isActive) {
      return Private.ended(record.purpose);
    }

    // used recently: nothing to save
    if (now - lastUsed < TouchInterval * 1000) {
      return { status: 200, value: record };
    }

    // save the last use (404: ended in the meantime, for example by a logout)
    const lastUsedAt = new Date(now);
    const r = await DbOpsUtils.put(config, record.id, { lastUsedAt }, { _id: 0, id: 1 }, _ctx);
    if (r.status === 404) {
      return Private.ended(record.purpose);
    }
    if (r.error) {
      return r;
    }

    return { status: 200, value: { ...record, lastUsedAt } };
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
   * email can be used), a new session ends the oldest sessions over the limit (SessionLimits.MaxPerUser)
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
    const now = Date.now();
    const expiresIn = UsersAuthConstants.TokenExpiresIn[purpose] * 1000; // ms
    const expiresAt = new Date(now + expiresIn); // a date, for the TTL index
    const lastUsedAt = new Date(now); // for the idle time of a session
    const record = { id, purpose, userID: user.userID, username: user.username, expiresAt, lastUsedAt };

    const r = await DbOpsUtils.post(config, record, _ctx);
    if (r.error) {
      return r;
    }

    // the oldest sessions of the user over the limit
    if (purpose === UsersAuthConstants.TokenPurpose.Session) {
      const rLimit = await Private.limitSessions(config, user.userID, r.value.id, _ctx);
      if (rLimit.error) {
        return rLimit;
      }
    }

    return { status: 201, value: { id, secret, expiresAt } };
  },

  /**
   * check the data of a token: its record exists (not ended), is for the same purpose and user, and is not expired (the
   * database removes the expired records only from time to time); a session is also not idle for too long, and its
   * use is saved
   * tokenData: { purpose, username, secret }
   * options: the options of the read of the record (DbOpsUtils.getOne), like { readPreference }
   * returns { status, value: { id, purpose, userID, username, expiresAt, lastUsedAt } } or { status, error }
   */
  check: async (tokenData, _ctx, options) => {
    const purpose = tokenData?.purpose;
    if (!tokenData?.secret) {
      return Private.ended(purpose);
    }

    const config = await Private.getConfig(_ctx);

    // a record not found on a secondary is read again on the primary: a session or a link created by the request
    // before may not be there yet (the first request after a login would answer 401: the UI goes to the login); an
    // ended session is still seen on a secondary for the replication lag. A refused token costs at most one read on
    // the primary, as a check on the primary does, and an open one none (the token is signed by the server: a forged
    // one is refused before any read)
    const id = Private.getID(tokenData.secret);
    const projection = { _id: 0, id: 1, purpose: 1, userID: 1, username: 1, expiresAt: 1, lastUsedAt: 1 };
    let r = await DbOpsUtils.getOne(config, id, projection, _ctx, options);
    const isPrimary = options?.readPreference === DbOpsUtils.Constants.ReadPrimary;
    if (r.status === 404 && !isPrimary) {
      const primary = { readPreference: DbOpsUtils.Constants.ReadPrimary };
      r = await DbOpsUtils.getOne(config, id, projection, _ctx, primary);
    }
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

    // a session: not idle for too long, and its use is saved
    if (purpose === UsersAuthConstants.TokenPurpose.Session) {
      return await Private.useSession(config, record, _ctx);
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
