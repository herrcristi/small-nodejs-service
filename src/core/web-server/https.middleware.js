/**
 * HTTPS enforcement middleware
 */
const CommonUtils = require('../utils/common.utils.js');

const Public = {
  /**
   * HTTPS enforcement middlware
   */
  middleware: (req, res, next) => {
    if (req.header('x-forwarded-proto') && req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  },
};

module.exports = { ...Public };
