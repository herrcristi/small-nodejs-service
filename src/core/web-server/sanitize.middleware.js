/**
 * Sanitize middleware
 *
 * refuses a request body that has keys which change the prototype of an object (__proto__, constructor, prototype)
 * or that is nested too deep. Such a body is never valid, and the services build objects from the body
 * the body of a change (POST, PUT, PATCH) is a JSON object: none is an empty object (the validation of the service
 * says what is missing), a body that was not parsed (another content type) is refused with 415, any other value
 * (a text, a list) with 400
 */
const RestMessagesUtils = require('../utils/rest-messages.utils.js');
const ValidationUtils = require('../utils/validation.utils.js');

const Private = {
  // the methods that change something: their body is a JSON object
  ChangeMethods: ['POST', 'PUT', 'PATCH'],

  /**
   * a refused body: logged, answered with its status and the reason
   */
  refuse: async (req, res, status, msg) => {
    console.log(`\nRequest refused: ${msg}`);
    const message = await RestMessagesUtils.statusError(status, { message: msg, error: new Error(msg) }, req._ctx);
    return res.status(status).json(message);
  },
};

const Public = {
  middleware: async (req, res, next) => {
    if (Private.ChangeMethods.includes(req.method)) {
      // a body that was sent but not parsed: a content type that is not supported
      const hasBody = Number(req.headers['content-length']) > 0 || !!req.headers['transfer-encoding'];
      if (req.body === undefined && hasBody) {
        return Private.refuse(req, res, 415, 'Request body must be JSON (Content-Type: application/json)');
      }

      // no body: an empty object (the validation of the service says what is missing)
      req.body ??= {};
      const isObject = typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body);
      if (!isObject) {
        return Private.refuse(req, res, 400, 'Request body must be a JSON object');
      }
    }

    const unsafe = ValidationUtils.findUnsafe(req.body);
    if (!unsafe) {
      return next();
    }

    const msg = unsafe.tooDeep ? 'Request body is nested too deep' : `Request body has a forbidden key: ${unsafe.key}`;
    return Private.refuse(req, res, 400, msg);
  },
};

module.exports = { ...Public };
