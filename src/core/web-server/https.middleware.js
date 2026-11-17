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
      const host = req.header('host');
      return res.redirect(`https://${host}${req.url}`);
    }
    next();
  },
};

module.exports = { ...Public };
