/**
 * Rate limiter middleware
 *
 * the limits are kept in the memory of each process (per pod): with more than one pod use a shared store
 * the client address is req.ip, which is the real client only when 'trust proxy' is configured (see
 * web-server.utils), otherwise the address of the proxy
 * the limits are given by the application (init); a missing or a wrong one is the default
 * a call of another service (a valid service token) is not limited: the services call each other when they run apart
 */
const { ipKeyGenerator } = require('express-rate-limit');

const CommonUtils = require('../utils/common.utils.js');
const RestCommsUtils = require('../utils/rest-communications.utils.js');

const Private = {
  Window: 15 * 60 * 1000, // 15 minutes

  // the limits given by the application: { max, loginMax, loginAccountMax, resetMax }
  Limits: {},

  /**
   * a limit given by the application (a positive integer, also as a string), or the default
   */
  limit: (value, defaultValue) => {
    const limit = Number.parseInt(value, 10);
    return Number.isInteger(limit) && limit > 0 ? limit : defaultValue;
  },

  /**
   * the account of a login or a reset password request (the email, as it is compared)
   */
  account: (req) => {
    return `${req.body?.username || ''}`.trim().toLowerCase();
  },

  /**
   * common settings
   */
  common: {
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    // no limit in debug mode, nor for a call of another service (a valid service token: the services run apart)
    skip: (req) => CommonUtils.isDebug() || RestCommsUtils.isS2SRequest(req),
  },
};

const Public = {
  /**
   * the limits of the application (its settings): { max, loginMax, loginAccountMax, resetMax }
   */
  init: (limits) => {
    Private.Limits = { ...limits };
  },

  /**
   * all the requests of a client address
   * a UI session makes many requests (lists, details, refreshes), so the limit is high
   */
  authLimiter: {
    ...Private.common,
    windowMs: Private.Window,
    limit: () => Private.limit(Private.Limits.max, 1000),
  },

  /**
   * failed logins of an account from one client address (a successful login is not counted)
   */
  loginLimiter: {
    ...Private.common,
    windowMs: Private.Window,
    limit: () => Private.limit(Private.Limits.loginMax, 5),
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req.ip);
      const account = Private.account(req);
      return `login|${ip}|${account}`;
    },
  },

  /**
   * failed logins of an account from all the addresses (a guess of one account from many addresses)
   */
  loginAccountLimiter: {
    ...Private.common,
    windowMs: Private.Window,
    limit: () => Private.limit(Private.Limits.loginAccountMax, 20),
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      const account = Private.account(req);
      return `login-account|${account}`;
    },
  },

  /**
   * reset password emails sent to an account (the mailbox of a person is not flooded)
   */
  resetPasswordLimiter: {
    ...Private.common,
    windowMs: Private.Window,
    limit: () => Private.limit(Private.Limits.resetMax, 3),
    keyGenerator: (req) => {
      const account = Private.account(req);
      return `reset-password|${account}`;
    },
  },
};

module.exports = { ...Public };
