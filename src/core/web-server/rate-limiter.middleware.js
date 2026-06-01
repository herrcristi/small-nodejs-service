/**
 * Rate limiter middleware
 */
const rateLimit = require('express-rate-limit');

const CommonUtils = require('../utils/common.utils.js');

const Public = {
  /**
   * Setups for rate limiter
   */
  authLimiter: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // allow a reasonable number; routers should tighten this for login endpoints
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => CommonUtils.isDebug(), // disable rate limiting in debug mode
  },

  loginLimiter: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // limit each IP to 3 login requests per windowMs (tighter)
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => CommonUtils.isDebug(), // disable rate limiting in debug mode
  },
};

module.exports = { ...Public };
