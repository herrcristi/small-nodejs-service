/**
 * Rest api utils
 */
const Aqs = require('api-query-params');

const CommonUtils = require('./common.utils');

const Utils = {
  /**
   * stringify a regexp
   */
  stringifyFilter: (key, value) => {
    return value instanceof RegExp ? value.toString() : value;
  },
};

const Public = {
  /**
   * validate and build Mongo filter from request
   * return filter: { filter, projection, limit, skip, sort }
   */
  buildMongoFilterFromReq: async (req, schema, _ctx) => {
    try {
      // convert query to mongo build
      let filter = Aqs(req.query, {
        projectionKey: 'projection',
      });

      console.log(`Current filter ${JSON.stringify(filter, Utils.stringifyFilter, 2)}`);

      // TODO use schema to validate filter
      // if (schema) {
      // }
      // TODO add search, searchFields
      // TODO set limit to some value like 1000 (if not set)

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
