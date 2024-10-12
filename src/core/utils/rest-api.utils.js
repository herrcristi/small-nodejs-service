/**
 * Rest api utils
 */
const Aqs = require('api-query-params');
const Joi = require('joi');

const CommonUtils = require('./common.utils.js');
const BaseServiceUtils = require('./base-service.utils.js');

const Utils = {
  /**
   *  convert multi fields into OR fields
   */
  convertFilter: (filter, _ctx) => {
    let convertedFilter = {
      $and: [],
    };

    // make OR from the multi fields
    for (const field of Object.keys(filter)) {
      const value = filter[field];

      const innerFields = field.split(',');
      const orFilter = { $or: [] };
      for (const innerField of innerFields) {
        orFilter.$or.push({ [innerField]: value });
      }

      convertedFilter.$and.push(orFilter.$or.length === 1 ? orFilter.$or[0] : orFilter);
    }

    return convertedFilter;
  },

  /**
   * get validator for fields adding search fields
   * config: { filter, sort? }
   */
  getValidator: (config, _ctx) => {
    let validateKeys = {};

    // all other fields
    for (const field of config.filter) {
      validateKeys[field] = Joi.any();
      validateKeys[`_lang_${_ctx.lang}.${field}`] = Joi.any();
    }

    return Joi.object().keys({
      $and: Joi.array().items(
        Joi.object().keys({
          ...validateKeys,
          $or: Joi.array().items(
            Joi.object().keys({
              ...validateKeys,
            })
          ),
        })
      ),
    });
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

      // convert multi fields into OR fields
      filter.filter = Utils.convertFilter(filter.filter, _ctx);

      // use config to validate filter
      if (config) {
        // create a Joi validator and add searchFields, searchValue (only strings so far)
        const validator = Utils.getValidator(config, _ctx);
        const v = validator.validate(filter.filter);
        if (v.error) {
          return BaseServiceUtils.getSchemaValidationError(v, filter.filter, _ctx);
        }
      }

      // optimize empty filter for countDocuments
      if (!Object.keys(filter.filter.$and).length) {
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
