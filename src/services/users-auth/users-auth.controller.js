/**
 * Users controller
 */

const CommonUtils = require('../../core/utils/common.utils.js');
const RestMessagesUtils = require('../../core/utils/rest-messages.utils.js');

const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthService = require('./users-auth.service.js');

/**
 * controller functions called from router
 */
const Public = {
  /**
   * login
   */
  login: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `${_ctx.serviceName}: Login called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await UsersAuthService.login(req.body, _ctx);
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
   * signup
   */
  signup: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `${_ctx.serviceName}: Signup called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // signup
      const r = await UsersAuthService.signup(req.body, _ctx);
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
   * validate
   */
  validate: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `${_ctx.serviceName}: Validate called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // validate
      const r = await UsersAuthService.validate(req.body, _ctx);
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
  getOne: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `${_ctx.serviceName}: Get one called, param ${JSON.stringify(CommonUtils.protectData(req.params), null, 2)}`
      );
      const objID = req.params.id;

      // get
      const r = await UsersAuthService.getOne(objID, { _id: 0 }, _ctx);
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
  post: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `${_ctx.serviceName}: Post called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await UsersAuthService.post(req.body, _ctx);
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
  delete: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `${_ctx.serviceName}: Delete called, param ${JSON.stringify(CommonUtils.protectData(req.params), null, 2)}`
      );
      const objID = req.params.id;

      // delete
      const r = await UsersAuthService.delete(objID, _ctx);
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
  put: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

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
      const r = await UsersAuthService.put(objID, req.body, _ctx);
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
  patch: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

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
      const r = await UsersAuthService.patch(objID, req.body, _ctx);
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
  notification: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `${_ctx.serviceName}: Notification called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await UsersAuthService.notification(req.body, _ctx);
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
