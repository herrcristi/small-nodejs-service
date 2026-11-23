/**
 * Rest messages utils
 */

const CommonUtils = require('./common.utils.js');

const Private = {
  /**
   * the reason of a refused request, for the user: the message the service wrote (a broken rule, the schema error)
   * returns the text, or undefined
   */
  getDetail: (error) => {
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error?.message === 'string') {
      return error.message;
    }
    return undefined;
  },
};

const Public = {
  /**
   * request is not valid
   * the reason is sent in every mode (detail), so the user knows what to change; only for 400: a 401 / 403 / 404 keeps
   * its generic text (it must not tell if an account exists) and a 500 never shows its cause
   */
  notValid: async (error, _ctx) => {
    let msg = {
      message: 'Request is not valid',
    };

    // the reason, for the user
    const detail = Private.getDetail(error);
    if (detail) {
      msg.detail = detail;
    }

    // detailed error in debug
    if (CommonUtils.isDebug()) {
      msg.error = CommonUtils.getLogError(error);
    }

    console.log(`\nStatus message: ${JSON.stringify(msg, null, 2)}. Request: ${JSON.stringify(_ctx)}`);

    return msg;
  },

  /**
   * a conflict (409): a value that must be unique is already used, or the object was changed meanwhile; the reason is
   * sent (detail), so the user knows what to change
   */
  conflict: async (error, _ctx) => {
    let msg = {
      message: 'Request is in conflict with the current data',
    };
    const detail = Private.getDetail(error);
    if (detail) {
      msg.detail = detail;
    }
    if (CommonUtils.isDebug()) {
      msg.error = CommonUtils.getLogError(error);
    }
    console.log(`\nStatus message: ${JSON.stringify(msg, null, 2)}. Request: ${JSON.stringify(_ctx)}`);
    return msg;
  },

  /**
   * a body of a type that is not supported (415): the API takes JSON
   */
  notSupported: async (error, _ctx) => {
    let msg = {
      message: 'Request has a content type that is not supported',
    };
    const detail = Private.getDetail(error);
    if (detail) {
      msg.detail = detail;
    }
    console.log(`\nStatus message: ${JSON.stringify(msg, null, 2)}. Request: ${JSON.stringify(_ctx)}`);
    return msg;
  },

  /**
   * the service can not take the request now (503): the database has no free connection in time; the cause is not
   * shown (like a 500), the request can be sent again later
   */
  unavailable: async (error, _ctx) => {
    let msg = {
      message: 'The service is busy, try again later',
    };
    if (CommonUtils.isDebug()) {
      msg.error = CommonUtils.getLogError(error);
    }
    console.log(`\nStatus message: ${JSON.stringify(msg, null, 2)}. Request: ${JSON.stringify(_ctx)}`);
    return msg;
  },

  /**
   * request is not authorized
   */
  notAuthorized: async (error, _ctx) => {
    let msg = {
      message: 'Request is not authorized',
    };

    // detailed error in debug
    if (CommonUtils.isDebug()) {
      msg.error = CommonUtils.getLogError(error);
    }

    console.log(`\nStatus message: ${JSON.stringify(msg, null, 2)}. Request: ${JSON.stringify(_ctx)}`);

    return msg;
  },

  /**
   * request is not having enough permissions
   */
  notPermissions: async (error, _ctx) => {
    let msg = {
      message: 'Request is not having enough permissions',
    };

    // detailed error in debug
    if (CommonUtils.isDebug()) {
      msg.error = CommonUtils.getLogError(error);
    }

    console.log(`\nStatus message: ${JSON.stringify(msg, null, 2)}. Request: ${JSON.stringify(_ctx)}`);

    return msg;
  },

  /**
   * not found
   */
  notFound: async (error, _ctx) => {
    let msg = {
      message: 'Not found',
    };

    // detailed error in debug
    if (CommonUtils.isDebug()) {
      msg.error = CommonUtils.getLogError(error);
    }

    console.log(`\nStatus message: ${JSON.stringify(msg, null, 2)}. Request: ${JSON.stringify(_ctx)}`);

    return msg;
  },

  /**
   * exception
   */
  exception: async (error, _ctx) => {
    let msg = {
      message: 'An unknown error has occured',
    };

    // detailed error in debug
    if (CommonUtils.isDebug()) {
      msg.error = CommonUtils.getLogError(error);
    }

    console.log(`\nStatus message: ${msg.message}. Error: ${msg.error}. Request: ${JSON.stringify(_ctx)}`);

    return msg;
  },

  /**
   * status error
   */
  statusError: async (status, error, _ctx) => {
    switch (status) {
      case 400:
        return await Public.notValid(error, _ctx);

      case 401:
        return await Public.notAuthorized(error, _ctx);

      case 403:
        return await Public.notPermissions(error, _ctx);

      case 404:
        return await Public.notFound(error, _ctx);

      case 409:
        return await Public.conflict(error, _ctx);

      case 415:
        return await Public.notSupported(error, _ctx);

      case 500:
        return await Public.exception(error, _ctx);

      case 503:
        return await Public.unavailable(error, _ctx);

      default:
        return await Public.exception(error || 'Error', _ctx);
    }
  },
};

module.exports = { ...Public };
