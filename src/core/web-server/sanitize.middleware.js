/**
 * Sanitize middleware
 *
 * refuses a request body that has keys which change the prototype of an object (__proto__, constructor, prototype)
 * or that is nested too deep. Such a body is never valid, and the services build objects from the body
 */
const RestMessagesUtils = require('../utils/rest-messages.utils.js');
const ValidationUtils = require('../utils/validation.utils.js');

const Public = {
  middleware: async (req, res, next) => {
    const unsafe = ValidationUtils.findUnsafe(req.body);
    if (!unsafe) {
      return next();
    }

    const msg = unsafe.tooDeep ? 'Request body is nested too deep' : `Request body has a forbidden key: ${unsafe.key}`;
    console.log(`\nRequest refused: ${msg}`);
    const message = await RestMessagesUtils.statusError(400, { message: msg, error: new Error(msg) }, req._ctx);
    return res.status(400).json(message);
  },
};

module.exports = { ...Public };
