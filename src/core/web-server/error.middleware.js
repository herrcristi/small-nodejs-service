/**
 * Error middleware
 */

const CommonUtils = require('../utils/common.utils');

const Public = {
  /**
   * Error middleware
   */
  middleware: (err, req, res, next) => {
    const msg = {
      error: {
        message: err.message || err,
      },
    };

    // detailed error in debug
    if (CommonUtils.isDebug()) {
      msg.error.error = CommonUtils.getLogError(err);
    }

    res.status(err.status || 500);
    res.json(msg);
    res.end();
  },
};

module.exports = { ...Public };
