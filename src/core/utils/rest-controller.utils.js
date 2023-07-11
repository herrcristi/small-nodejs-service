/**
 * Base controller
 */
const Joi = require('joi');

const RestApiUtils = require('./rest-api.utils');
const RestMsgUtils = require('./rest-messages.utils');
const CommonUtils = require('./common.utils');

const Public = {
  /**
   * reply
   * controller = { name, schema, service }
   * result = { status, error?, value? }
   */
  reply: async (controller, result, req, res, next) => {
    const _ctx = req._ctx;
    try {
      if (result.error) {
        return res.status(result.status).json(await RestMsgUtils.statusError(result.status, result.error, _ctx));
      }
      res.status(result.status).json(result.value);
    } catch (e) {
      return res.status(500).json(await RestMsgUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },

  /**
   * get all base implementation
   * controller = { name, schema, service }
   */
  getAll: async (controller, req, res, next) => {
    const _ctx = req._ctx;
    try {
      console.log(`${controller.name}: Get all called, query ${JSON.stringify(CommonUtils.protectData(req.query))}`);

      // convert query to mongo build filter: { filter, projection, limit, skip, sort }
      const filter = await RestApiUtils.buildMongoFilterFromReq(req, controller.schema, _ctx);
      if (filter.error) {
        return { status: 400, error: filter.error };
      }

      // get all
      let r = await controller.service.getAll(filter, _ctx);
      if (r.error) {
        throw r.error.error;
      }

      // get corresponding count
      let rCount = await controller.service.getAllCount(filter, _ctx);
      if (rCount.error) {
        throw rCount.error.error;
      }

      const limit = filter.limit || 0;
      const skip = filter.skip || 0;
      const currentLimit = skip + limit;

      // success
      return {
        status: currentLimit && currentLimit < rCount.value ? 206 /*partial data*/ : 200,
        value: {
          data: r.value,
          meta: {
            count: rCount.value,
            limit,
            skip,
            sort: filter.sort,
          },
        },
      };
    } catch (e) {
      return { status: 500, error: e };
    }
  },

  /**
   * get one
   * controller = { name, schema, service }
   */
  getOne: async (controller, req, res, next) => {
    const _ctx = req._ctx;
    try {
      console.log(`${controller.name}: Get one called, param ${JSON.stringify(CommonUtils.protectData(req.params))}`);
      const objID = req.params.id;

      // get
      let r = await controller.service.getOne(objID, _ctx);
      if (r.error) {
        throw r.error.error;
      }

      // not found
      if (!r.value) {
        return { status: 404, error: objID };
      }

      // success
      return { status: 200, value: r.value };
    } catch (e) {
      return { status: 500, error: e };
    }
  },

  /**
   * post
   * controller = { name, schema, service }
   */
  post: async (controller, req, res, next) => {
    const _ctx = req._ctx;
    try {
      console.log(`${controller.name}: Post called, param ${JSON.stringify(CommonUtils.protectData(req.params))}`);

      // validate
      const v = controller.schema.validate(req.body);
      if (v.error) {
        return { status: 400, error: v.error.error };
      }

      // post
      const newO = controller.service.post(req.body, _ctx);

      // success
      return { status: 201, value: newO.id };
    } catch (e) {
      return { status: 500, error: e };
    }
  },

  /**
   * delete
   * controller = { name, schema, service }
   */
  delete: async (controller, req, res, next) => {
    const _ctx = req._ctx;
    try {
      console.log(`${controller.name}: Delete called, param ${JSON.stringify(CommonUtils.protectData(req.params))}`);
      const objID = req.params.id;

      // delete
      let r = await controller.service.delete(objID, _ctx);
      if (r.error) {
        throw r.error.error;
      }

      // not found
      if (!r.value) {
        return { status: 404, error: objID };
      }

      // success
      return { status: 200, value: r.value };
    } catch (e) {
      return { status: 500, error: e };
    }
  },

  /**
   * patch
   * controller = { name, schema, service }
   */
  patch: async (controller, req, res, next) => {
    const _ctx = req._ctx;
    try {
      console.log(`${controller.name}: Put called, param ${JSON.stringify(CommonUtils.protectData(req.params))}`);
      const objID = req.params.id;

      // validate
      const v = controller.schema.validate(req.body);
      if (v.error) {
        return { status: 400, error: v.error.error };
      }

      // patch
      const r = controller.service.patch(objID, req.body, _ctx);

      // not found
      if (!r.value) {
        return { status: 404, error: objID };
      }

      // success
      return { status: 200, value: r.value };
    } catch (e) {
      return { status: 500, error: e };
    }
  },

  /**
   * put
   * controller = { name, schema, service }
   */
  put: async (controller, req, res, next) => {
    const _ctx = req._ctx;
    try {
      console.log(`${controller.name}: Put called, param ${JSON.stringify(CommonUtils.protectData(req.params))}`);
      const objID = req.params.id;

      // validate
      const v = controller.schema.validate(req.body);
      if (v.error) {
        return { status: 400, error: v.error.error };
      }

      // put
      const r = controller.service.put(objID, req.body, _ctx);

      // not found
      if (!r.value) {
        return { status: 404, error: objID };
      }

      // success
      return { status: 200, value: r.value };
    } catch (e) {
      return { status: 500, error: e };
    }
  },
};

module.exports = { ...Public };
