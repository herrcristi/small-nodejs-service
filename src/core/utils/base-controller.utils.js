/**
 * Base controller
 */

const CommonUtils = require('./common.utils.js');
const RestMessagesUtils = require('./rest-messages.utils.js');

const Public = {
  /**
   * get all
   */
  getAll: async (service, serviceName, req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = serviceName;

    try {
      console.log(
        `${_ctx.serviceName}: Get all called, query ${JSON.stringify(
          CommonUtils.protectData(req.query),
          CommonUtils.stringifyFilter,
          2
        )}`
      );

      // get all
      const r = await service.getAllForReq(req, _ctx);
      if (r.error) {
        return res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error, _ctx));
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      return res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },

  /**
   * get one
   */
  getOne: async (service, serviceName, req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = serviceName;

    try {
      console.log(
        `${_ctx.serviceName}: Get one called, param ${JSON.stringify(CommonUtils.protectData(req.params), null, 2)}`
      );
      const objID = req.params.id;

      // get
      const r = await service.getOne(objID, null, _ctx);
      if (r.error) {
        return res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error, _ctx));
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      return res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },

  /**
   * post
   */
  post: async (service, serviceName, req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = serviceName;

    try {
      console.log(
        `${_ctx.serviceName}: Post called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await service.post(req.body, _ctx);
      if (r.error) {
        return res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error, _ctx));
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      return res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },

  /**
   * delete
   */
  delete: async (service, serviceName, req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = serviceName;

    try {
      console.log(
        `${_ctx.serviceName}: Delete called, param ${JSON.stringify(CommonUtils.protectData(req.params), null, 2)}`
      );
      const objID = req.params.id;

      // delete
      const r = await service.delete(objID, _ctx);
      if (r.error) {
        return res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error, _ctx));
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      return res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },

  /**
   * put
   */
  put: async (service, serviceName, req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = serviceName;

    try {
      console.log(
        `${_ctx.serviceName}: Put called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )}, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );
      const objID = req.params.id;

      // put
      const r = await service.put(objID, req.body, _ctx);
      if (r.error) {
        return res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error, _ctx));
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      return res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },

  /**
   * patch
   */
  patch: async (service, serviceName, req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = serviceName;

    try {
      console.log(
        `${_ctx.serviceName}: Patch called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )} body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );
      const objID = req.params.id;

      // patch
      const r = await service.patch(objID, req.body, _ctx);
      if (r.error) {
        return res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error, _ctx));
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      return res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },

  /**
   * notification
   */
  notification: async (service, serviceName, req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = serviceName;

    try {
      console.log(
        `${_ctx.serviceName}: Notification called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await service.notification(req.body, _ctx);
      if (r.error) {
        return res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error, _ctx));
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      return res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },
};

module.exports = { ...Public };
