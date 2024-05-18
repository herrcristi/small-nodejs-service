/**
 * Rest api utils
 */
const Aqs = require('api-query-params');

const CommonUtils = require('./common.utils.js');

const Public = {
  /**
   * validate and build filter from request
   * return { status, value: { filter, projection, limit, skip, sort } }
   */
  buildFilterFromReq: async (req, schema, _ctx) => {
    try {
      // convert query to mongo build
      let filter = Aqs(req.query, {
        projectionKey: 'projection',
      });

      // _id: 0
      filter.projection ??= {};
      filter.projection['_id'] = 0;

      // TODO set limit to some value like 10000 (if not set)
      filter.limit = filter.limit || 0;
      filter.skip = filter.skip || 0;

      // TODO add search, searchFields

      // TODO use schema to validate filter
      // if (schema) {
      // }

      return { status: 200, value: filter };
    } catch (e) {
      console.log(
        `\nFailed to build mongo filter from ${JSON.stringify(
          req?.quey,
          CommonUtils.stringifyFilter,
          2
        )}. Error: ${CommonUtils.getLogError(e)}`
      );

      return {
        status: 400,
        error: {
          message: `Failed to convert query to filter. ${e.message}`,
          error: e,
        },
      };
    }
  },

  /**
   * validate and build filter from request
   * return filter: { filter, projection, limit, skip, sort }
   */
  getMetaInfo: (filter, count, _ctx) => {
    const currentLimit = filter.skip + filter.limit;

    // success
    return {
      status: filter.limit && currentLimit < count ? 206 /*partial data*/ : 200,
      meta: {
        count,
        limit: filter.limit,
        skip: filter.skip,
        sort: filter.sort,
      },
    };
  },
};

module.exports = { ...Public };
