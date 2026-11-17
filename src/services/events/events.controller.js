/**
 * Events controller
 */

const CommonUtils = require('../../core/utils/common.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const RestMessagesUtils = require('../../core/utils/rest-messages.utils.js');

const EventsConstants = require('./events.constants.js');
const EventsService = require('./events.service.js');

/**
 * controller functions called from router
 */
const Public = {
  /**
   * get all
   */
  getAll: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = EventsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Get all called, query ${JSON.stringify(
          CommonUtils.protectData(req.query),
          CommonUtils.stringifyFilter,
          2
        )}`
      );

      // get all
      const r = await EventsService.getAllForReq(req, _ctx);
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
    _ctx.serviceName = EventsConstants.ServiceName;

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
      const r = await EventsService.getOne(objID, rf.value.projection, _ctx);
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
    _ctx.serviceName = EventsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Post called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await EventsService.post(req.body, _ctx);
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
    _ctx.serviceName = EventsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Notification called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await EventsService.notification(req.body, _ctx);
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
