/**
 * Rest api utils
 */
const Aqp = require('api-query-params').default;
const Joi = require('joi');

const CommonUtils = require('./common.utils.js');

const Constants = {
  // the most objects of one list request (also for "all": limit -1)
  MaxLimit: 10000,
  // the operators allowed inside a filter field (`a=x,y` gives $in, `a!=x` $ne, `a>1` $gt, ...); any other one is
  // refused, like $where
  FilterOperators: ['$in', '$nin', '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$exists', '$not', '$regex', '$options'],
};

const Utils = {
  /**
   * a list request that is not valid (400)
   */
  invalid: (msg, _ctx) => {
    console.log(`\nList request not valid: ${msg}`);
    return { status: 400, error: { message: msg, error: new Error(msg) } };
  },

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

    // the value of a field: a text, a number, a boolean, a date, a regular expression (a search), null, or an object
    // of the allowed operators only
    const simpleValue = Joi.alternatives().try(
      Joi.string().allow(''),
      Joi.number(),
      Joi.boolean(),
      Joi.date(),
      Joi.object().instance(RegExp),
      Joi.valid(null)
    );
    const operatorValue = Joi.alternatives().try(simpleValue, Joi.array().items(simpleValue));
    const fieldValue = Joi.alternatives().try(
      simpleValue,
      Joi.object().pattern(Joi.string().valid(...Constants.FilterOperators), operatorValue)
    );

    // all other fields
    for (const field of config.filter) {
      validateKeys[field] = fieldValue;
      validateKeys[`_lang_${_ctx.lang}.${field}`] = fieldValue;
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
      let filter = Aqp(req.query, {
        projectionKey: 'projection',
      });

      // _id: 0
      filter.projection ??= {};
      filter.projection['_id'] = 0;

      // the limit: a whole number from 1, or -1 / 0 / none for all (the UI sends -1 for "All"), at most MaxLimit; a
      // negative limit would give one object (MongoDB reads it as "one batch")
      const limit = filter.limit ?? -1;
      if (!Number.isInteger(limit) || limit < -1) {
        return Utils.invalid('"limit" must be a whole number from 1, or -1 for all', _ctx);
      }
      filter.limit = limit <= 0 ? Constants.MaxLimit : Math.min(limit, Constants.MaxLimit);

      // the skip: a whole number from 0
      const skip = filter.skip ?? 0;
      if (!Number.isInteger(skip) || skip < 0) {
        return Utils.invalid('"skip" must be a whole number from 0', _ctx);
      }
      filter.skip = skip;
      filter.sort = filter.sort || config?.sort;

      // convert multi fields into OR fields
      filter.filter = Utils.convertFilter(filter.filter, _ctx);

      // use config to validate filter
      if (config) {
        // create a Joi validator and add searchFields, searchValue (only strings so far)
        const validator = Utils.getValidator(config, _ctx);
        const v = validator.validate(filter.filter);
        if (v.error) {
          return CommonUtils.getSchemaValidationError(v, filter.filter, _ctx);
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

module.exports = { ...Public, Constants };
