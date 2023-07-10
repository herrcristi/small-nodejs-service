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

    console.log(`${JSON.stringify(msg, null, 2)}. Request: ${JSON.stringify(_ctx)}`);

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

    console.log(`${JSON.stringify(msg, null, 2)}. Request: ${JSON.stringify(_ctx)}`);

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

    console.log(`${JSON.stringify(msg, null, 2)}. Request: ${JSON.stringify(_ctx)}`);

    return msg;
  },
};

module.exports = { ...Public };
