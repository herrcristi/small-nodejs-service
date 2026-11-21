/**
 * Security headers middleware
 */
const CommonUtils = require('../utils/common.utils.js');

const Public = {
  /**
   * Security headers middlware
   */
  middleware: (req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
    // the answers are personal (the session, the data of a school): a browser or a proxy never keeps them
    res.setHeader('Cache-Control', 'no-store');
    next();
  },
};

module.exports = { ...Public };
