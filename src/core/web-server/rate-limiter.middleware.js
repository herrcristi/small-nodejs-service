/**
 * Rate limiter middleware
 *
 * the limits are kept in the memory of each process (per pod): with more than one pod use a shared store
 * the client address is req.ip, which is the real client only when 'trust proxy' is configured
 * (SMALL_API_TRUST_PROXY, see web-server.utils), otherwise the address of the proxy
 */
const { ipKeyGenerator } = require('express-rate-limit');

const CommonUtils = require('../utils/common.utils.js');

const Private = {
  Window: 15 * 60 * 1000, // 15 minutes

  /**
   * a limit from the environment, or the default
   */
  limit: (name, defaultValue) => {
    const value = Number.parseInt(process.env[name], 10);
    return Number.isInteger(value) && value > 0 ? value : defaultValue;
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
    skip: (req) => CommonUtils.isDebug(), // disable rate limiting in debug mode
  },
};

const Public = {
  /**
   * all the requests of a client address
   * a UI session makes many requests (lists, details, refreshes), so the limit is high
   */
  authLimiter: {
    ...Private.common,
    windowMs: Private.Window,
    limit: () => Private.limit('SMALL_API_RATE_LIMIT_MAX', 1000),
  },

  /**
   * failed logins of an account from one client address (a successful login is not counted)
   */
  loginLimiter: {
    ...Private.common,
    windowMs: Private.Window,
    limit: () => Private.limit('SMALL_API_RATE_LIMIT_LOGIN_MAX', 5),
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
    limit: () => Private.limit('SMALL_API_RATE_LIMIT_LOGIN_ACCOUNT_MAX', 20),
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
    limit: () => Private.limit('SMALL_API_RATE_LIMIT_RESET_MAX', 3),
    keyGenerator: (req) => {
      const account = Private.account(req);
      return `reset-password|${account}`;
    },
  },
};

module.exports = { ...Public };
