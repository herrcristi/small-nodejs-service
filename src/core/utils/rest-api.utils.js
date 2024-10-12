/**
 * Rest api utils
 */
const Aqs = require('api-query-params');
const Joi = require('joi');

const CommonUtils = require('./common.utils.js');
const BaseServiceUtils = require('./base-service.utils.js');

const Utils = {
  /**
   * get validator for fields adding search fields
   * config: { filter, sort, search }
   */
  getValidator: (config, _ctx) => {
    const validateKeys = {
      searchFields: Joi.array().items(
        Joi.string()
          .min(1)
          .max(128)
          .valid(...config.search)
      ), // this will be OR'ed

      searchValue: Joi.string().when('searchFields', {
        is: Joi.exist(),
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
    };

    // all other fields
    for (const field of config.filter) {
      validateKeys[field] = Joi.any();
    }

    return Joi.object().keys(validateKeys);
  },

  /**
   * convert searchFields and searchValue to real db query
   */
  updateSearchFilter: (filter, _ctx) => {
    if (!filter.searchFields) {
      return;
    }
    const fields = filter.searchFields;
    let value = filter.searchValue;
    delete filter.searchFields;
    delete filter.searchValue;

    // must replace special regexp characters
    value = value.replace(/[.*+?^${}()|[\]\\]/g, '');

    // make OR from the searchFields
    filter.$or = [];
    for (const field of fields) {
      filter.$or.push({
        [field]: new RegExp(value, 'i'),
      });
    }
  },
};

const Public = {
  /**
   * validate and build filter from request
   * config?: { fields, sort, search }
   * return { status, value: { filter, projection, limit, skip, sort } }
   */
  buildFilterFromReq: async (req, config, _ctx) => {
    try {
      // convert query to mongo build
      let filter = Aqs(req.query, {
        projectionKey: 'projection',
      });

      // _id: 0
      filter.projection ??= {};
      filter.projection['_id'] = 0;

      // set limit to some value like 10000 (if not set)
      filter.limit = Math.min(filter.limit || 10000, 10000);
      filter.skip = filter.skip || 0;
      filter.sort = filter.sort || config?.sort;

      // use config to validate filter
      if (config) {
        if (filter.filter.searchFields) {
          filter.filter.searchFields = filter.filter.searchFields.$in || [filter.filter.searchFields];
        }

        // create a Joi validator and add searchFields, searchValue (only strings so far)
        const validator = Utils.getValidator(config, _ctx);
        const v = validator.validate(filter.filter);
        if (v.error) {
          return BaseServiceUtils.getSchemaValidationError(v, filter.filter, _ctx);
        }

        // convert searchFields and searchValue to real db query
        Utils.updateSearchFilter(filter.filter, _ctx);
      }

      // optimize empty filter for countDocuments
      if (!Object.keys(filter.filter).length) {
        filter.filter = { id: { $exists: true } };
      }

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
