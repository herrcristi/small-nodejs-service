/**
 * Users controller
 */
const Joi = require('joi');

const RestApiUtils = require('./rest-api.utils');
const RestMsgUtils = require('./rest-messages.utils');

const Public = {
  /**
   * get all base implementation
   * controller = { name, schema, service }
   */
  getAll: async (controller, req, res, _next) => {
    const _ctx = req._ctx;
    try {
      console.log(`${controller.name}: Get all called, query ${JSON.stringify(req.query)}`);

      // convert query to mongo build
      const filter = await RestApiUtils.buildMongoFilterFromReq(req, controller.schema, _ctx);
      if (filter.error) {
        return res.status(400).json(await RestMsgUtils.notValid(filter.error.message, _ctx));
      }

      // get all users
      let res = await controller.service.getAll(filter, _ctx);
      if (res.error) {
        throw res.error.error;
      }

      // success
      res.status(200).json({ data: res.value });
    } catch (e) {
      return res.status(500).json(await RestMsgUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },

  /**
   * get one
   * controller = { name, schema, service }
   */
  getOne: async (controller, req, res, _next) => {
    const _ctx = req._ctx;
    try {
      console.log(`${controller.name}: Get one called, param ${JSON.stringify(req.params)}`);
      const objID = req.params.id;

      // get
      let r = await controller.service.getOne(objID, _ctx);
      if (r.error) {
        throw r.error.error;
      }

      // not found
      if (!r.value) {
        return res.status(404).json(await RestMsgUtils.notFound(objID, _ctx));
      }

      // success
      res.status(200).json({ data: r.value });
    } catch (e) {
      return res.status(500).json(await RestMsgUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },
};

module.exports = { ...Public };
