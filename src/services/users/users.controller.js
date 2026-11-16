/**
 * Users controller
 */

const CommonUtils = require('../../core/utils/common.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const RestMessagesUtils = require('../../core/utils/rest-messages.utils.js');

const UsersConstants = require('./users.constants.js');
const UsersService = require('./users.service.js');

/**
 * controller functions called from router
 */
const Public = {
  /**
   * get all
   */
  getAll: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Get all called, query ${JSON.stringify(
          CommonUtils.protectData(req.query),
          CommonUtils.stringifyFilter,
          2
        )}`
      );

      // get all
      const r = await UsersService.getAllForReq(req, _ctx);
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
   * get all portal admins
   */
  getPortalAdmins: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Get portal admins called, query ${JSON.stringify(
          CommonUtils.protectData(req.query),
          CommonUtils.stringifyFilter,
          2
        )}`
      );

      const r = await UsersService.getPortalAdminsForReq(req, _ctx);
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
   * get all admins of a school
   */
  getSchoolAdmins: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Get school admins called, params ${JSON.stringify(
          CommonUtils.protectData(req.params)
        )}, query ${JSON.stringify(CommonUtils.protectData(req.query), CommonUtils.stringifyFilter, 2)}`
      );

      const r = await UsersService.getSchoolAdminsForReq(req.params.schoolId, req, _ctx);
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
    _ctx.serviceName = UsersConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Get one called, param ${JSON.stringify(CommonUtils.protectData(req.params), null, 2)}`
      );
      const objID = req.params.id;
      // projection
      const rf = await RestApiUtils.buildFilterFromReq(req, null /*no schema*/, _ctx);
      if (rf.error) {
        return res.status(rf.status).json(await RestMessagesUtils.statusError(rf.status, rf.error, _ctx));
      }

      // get
      const r = await UsersService.getOneForReq(objID, rf.value.projection, _ctx);
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
    _ctx.serviceName = UsersConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Post called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await UsersService.post(req.body, _ctx);
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
    _ctx.serviceName = UsersConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Delete called, param ${JSON.stringify(CommonUtils.protectData(req.params), null, 2)}`
      );
      const objID = req.params.id;

      // delete
      const r = await UsersService.delete(objID, _ctx);
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
    _ctx.serviceName = UsersConstants.ServiceName;

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
      const r = await UsersService.putForReq(objID, req.body, _ctx);
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
   * putStatus (internal) called from users-auth to activate the user
   */
  putStatus: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Put status called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )}, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );
      const objID = req.params.id;

      // put
      const r = await UsersService.putStatus(objID, req.body, _ctx);
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
   * putEmail (internal) called from users-auth
   */
  putEmail: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Put email called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )}, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );
      const objID = req.params.id;

      // put
      const r = await UsersService.putEmail(objID, req.body, _ctx);
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
    _ctx.serviceName = UsersConstants.ServiceName;

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
      const r = await UsersService.patchForReq(objID, req.body, _ctx);
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
   * patch school (by school admin) called from users-auth
   */
  patchSchool: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Patch school called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )} body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );
      const objID = req.params.id;

      // patch
      const r = await UsersService.patchSchool(objID, req.body, _ctx);
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
    _ctx.serviceName = UsersConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Notification called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // post
      const r = await UsersService.notification(req.body, _ctx);
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
