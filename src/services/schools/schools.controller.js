/**
 * Schools controller
 */

const CommonUtils = require('../../core/utils/common.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const RestMessagesUtils = require('../../core/utils/rest-messages.utils.js');

const SchoolsConstants = require('./schools.constants.js');
const SchoolsService = require('./schools.service.js');

/**
 * controller functions called from router
 */
const Public = {
  /**
   * get all
   */
  getAll: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = SchoolsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Get all called, query ${JSON.stringify(
          CommonUtils.protectData(req.query),
          CommonUtils.stringifyFilter,
          2
        )}`
      );

      // get all
      const r = await SchoolsService.getAllForReq(req, _ctx);
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
    _ctx.serviceName = SchoolsConstants.ServiceName;

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
      const r = await SchoolsService.getOne(objID, rf.value.projection, _ctx);
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
    _ctx.serviceName = SchoolsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Delete called, param ${JSON.stringify(CommonUtils.protectData(req.params), null, 2)}`
      );
      const objID = req.params.id;

      // delete
      const r = await SchoolsService.delete(objID, _ctx);
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
    _ctx.serviceName = SchoolsConstants.ServiceName;

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
      const r = await SchoolsService.put(objID, req.body, _ctx);
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
   * get the settings of a school (its admins)
   */
  getSettings: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = SchoolsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Get settings called, param ${JSON.stringify(CommonUtils.protectData(req.params), null, 2)}`
      );
      const objID = req.params.id;

      // get the settings
      const r = await SchoolsService.getSettings(objID, _ctx);
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
   * put the settings of a school (its admins)
   */
  putSettings: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = SchoolsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Put settings called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )}, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );
      const objID = req.params.id;

      // put the settings
      const r = await SchoolsService.putSettings(objID, req.body, _ctx);
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
    _ctx.serviceName = SchoolsConstants.ServiceName;

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
      const r = await SchoolsService.patch(objID, req.body, _ctx);
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
   * internal service endpoints
   */
  post: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = SchoolsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Internal post called, body ${JSON.stringify(
          CommonUtils.protectData(req.body),
          null,
          2
        )}`
      );
      const r = await SchoolsService.post(req.body, _ctx);
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
   * activate (internal) called from users-auth at login and on the session refresh
   */
  activate: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = SchoolsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Activate called, param ${JSON.stringify(CommonUtils.protectData(req.params), null, 2)}`
      );
      const r = await SchoolsService.activate(req.params.id, _ctx);
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
    _ctx.serviceName = SchoolsConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Notification called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await SchoolsService.notification(req.body, _ctx);
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
