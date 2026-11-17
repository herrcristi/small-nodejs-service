/**
 * Locations controller
 */

const CommonUtils = require('../../core/utils/common.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const RestMessagesUtils = require('../../core/utils/rest-messages.utils.js');

const LocationsConstants = require('./locations.constants.js');
const LocationsService = require('./locations.service.js');

/**
 * controller functions called from router
 */
const Public = {
  /**
   * get all
   */
  getAll: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = LocationsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Get all called, query ${JSON.stringify(
          CommonUtils.protectData(req.query),
          CommonUtils.stringifyFilter,
          2
        )}`
      );

      // get all
      const r = await LocationsService.getAllForReq(req, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * get one
   */
  getOne: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = LocationsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Get one called, param ${JSON.stringify(CommonUtils.protectData(req.params), null, 2)}`
      );
      const objID = req.params.id;
      // projection
      const rf = await RestApiUtils.buildFilterFromReq(req, null /*no schema*/, _ctx);
      if (rf.error) {
        const message = await RestMessagesUtils.statusError(rf.status, rf.error, _ctx);
        return res.status(rf.status).json(message);
      }

      // get
      const r = await LocationsService.getOne(objID, rf.value.projection, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * post
   */
  post: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = LocationsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Post called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await LocationsService.post(req.body, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * delete
   */
  delete: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = LocationsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Delete called, param ${JSON.stringify(CommonUtils.protectData(req.params), null, 2)}`
      );
      const objID = req.params.id;

      // delete
      const r = await LocationsService.delete(objID, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * put
   */
  put: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = LocationsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Put called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )}, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );
      const objID = req.params.id;

      // put
      const r = await LocationsService.put(objID, req.body, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * patch
   */
  patch: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = LocationsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Patch called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )} body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );
      const objID = req.params.id;

      // patch
      const r = await LocationsService.patch(objID, req.body, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * notification
   */
  notification: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = LocationsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Notification called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await LocationsService.notification(req.body, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },
};

module.exports = { ...Public };
