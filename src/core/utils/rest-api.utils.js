/**
 * Rest api utils
 */
const Aqs = require('api-query-params');

const CommonUtils = require('./common.utils.js');

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

      // _id: 0
      filter.projection ??= {};
      filter.projection['_id'] = 0;

      let testF = JSON.stringify(filter, CommonUtils.stringifyFilter, 2);

      // TODO use schema to validate filter
      // if (schema) {
      // }
      // TODO add search, searchFields
      // TODO set limit to some value like 1000 (if not set)

      return filter;
    } catch (e) {
      return {
        status: 400,
        error: {
          message: e.message || 'Failed to validate query',
          error: e,
        },
      };
    }
  },
};

module.exports = { ...Public };
