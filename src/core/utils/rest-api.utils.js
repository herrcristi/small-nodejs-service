/**
 * Rest api utils
 */
const Aqs = require('api-query-params');

const CommonUtils = require('./common.utils');

const Public = {
  /**
   * validate and build Mongo filter from request
   */
  buildMongoFilterFromReq: async (req, schema, _ctx) => {
    try {
      // convert query to mongo build
      let filter = Aqs(req.query, {
        whitelist: [],
      });

      console.log(`Current filter ${JSON.stringify(filter, null, 2)}`);

      return filter;
    } catch (e) {
      return {
        error: {
          message: e.message || 'Failed to validate query',
          error: e,
        },
      };
    }
  },
};

module.exports = { ...Public };
