/**
 * Error middleware
 *
 * the errors that are not answered by a controller (a body that is not JSON, a body that is too large, an exception in
 * a middleware): the same answer as the controllers give, a generic message for the status, the reason of a refused
 * request (400, detail), and the details only in debug mode (a server error never shows its cause)
 */

const RestMessagesUtils = require('../utils/rest-messages.utils.js');

const Public = {
  /**
   * Error middleware
   */
  middleware: async (err, req, res, next) => {
    // the status of the error, otherwise a server error
    const status = err?.status || err?.statusCode || 500;

    const message = await RestMessagesUtils.statusError(status, err, req._ctx);
    return res.status(status).json(message);
  },
};

module.exports = { ...Public };
