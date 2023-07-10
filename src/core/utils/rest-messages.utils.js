/**
 * Rest messages utils
 */

const CommonUtils = require('./common.utils');

const Public = {
  /**
   * request is not valid
   */
  notValid: async (error, _ctx) => {
    let msg = {
      message: 'Request is not valid',
    };

    // detailed error in debug
    if (CommonUtils.isDebug()) {
      msg.error = error;
    }

    console.log(`Status message: ${JSON.stringify(msg, null, 2)}. Request: ${JSON.stringify(_ctx)}`);

    return msg;
  },

  /**
   * not found
   */
  notFound: async (objID, error, _ctx) => {
    let msg = {
      message: 'Not found',
    };

    // detailed error in debug
    if (CommonUtils.isDebug()) {
      msg.error = `${objID}`;
    }

    console.log(`Status message: ${JSON.stringify(msg, null, 2)}. Request: ${JSON.stringify(_ctx)}`);

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
      msg.error = error.stack || error;
    }

    console.log(`Status message: ${msg.message}. Stack: ${error.stack}. Request: ${JSON.stringify(_ctx)}`);

    return msg;
  },

  /**
   * status error
   */
  statusError: async (status, error, _ctx) => {
    switch (status) {
      case 400:
        return await Public.notValid(error, _ctx);

      case 404:
        return await Public.notFound(error, _ctx);

      case 500:
        return await Public.exception(error, _ctx);

      default:
        return await Public.exception('Error', _ctx);
    }
  },
};

module.exports = { ...Public };
