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
        `\n${_ctx.serviceName}: Login called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await UsersAuthService.login(req.body, _ctx);
      if (r.error) {
        return res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error, _ctx));
      }

      // set token as cookie
      res.cookie(UsersAuthConstants.AuthToken, r.token, {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000 /*1d*/),
        httpOnly: true,
      });
      res.status(r.status).json(r.value);
    } catch (e) {
      return res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },

  /**
   * logout
   */
  logout: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Logout called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await UsersAuthService.logout(_ctx);
      if (r.error) {
        return res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error, _ctx));
      }

      // set token as cookie
      res.cookie(UsersAuthConstants.AuthToken, r.token, {
        expires: new Date(Date.now() - 60 * 60 * 1000 /*expired by 1hour*/),
        httpOnly: true,
      });
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
        `\n${_ctx.serviceName}: Validate called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // get token from cookie
      const token = req.cookies[UsersAuthConstants.AuthToken];
      const method = req.query['method'];
      const route = req.query['route'];

      // validate
      const r = await UsersAuthService.validate({ token, method, route }, _ctx);
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
        `\n${_ctx.serviceName}: Post called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
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
   * put password
   */
  putPassword: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Put password called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )}`
      );
      const objID = req.params.id;

      // put
      const r = await UsersAuthService.putPassword(objID, req.body, _ctx);
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
   * put id (email)
   */
  putID: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Put id (email) called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )}, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );
      const objID = req.params.id;

      // put
      const r = await UsersAuthService.putID(objID, req.body, _ctx);
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
   * patch password
   */
  patchPassword: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Patch password called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )}`
      );
      const objID = req.params.id;

      // patch
      const r = await UsersAuthService.patchPassword(objID, req.body, _ctx);
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
   * patch id (email)
   */
  patchID: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Patch id (email) called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )} body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );
      const objID = req.params.id;

      // patch
      const r = await UsersAuthService.patchID(objID, req.body, _ctx);
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
   * patch called by admin to add/remove user to school (_ctx.tenantID)
   */
  patchUserSchool: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Patch called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )} body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );
      const adminID = req.params.id;
      const userID = req.params.uid;

      // patch
      const r = await UsersAuthService.patchUserSchool(adminID, userID, req.body, _ctx);
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
        `\n${_ctx.serviceName}: Notification called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
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
