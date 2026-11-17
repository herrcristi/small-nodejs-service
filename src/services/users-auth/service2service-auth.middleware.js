/**
 * service 2 service middleware
 */
const CommonUtils = require('../../core/utils/common.utils.js');
const RestMessagesUtils = require('../../core/utils/rest-messages.utils.js');
const RestCommsUtils = require('../../core/utils/rest-communications.utils.js');

const UsersAuthRest = require('../rest/users-auth.rest.js');
const WebServerConstants = require('../../web-server/web-server.constants.js');

const Public = {
  /**
   * service 2 service middlware
   */
  middleware: async (req, res, next) => {
    const _ctx = req._ctx;
    // the tenant name is never taken from the headers: it comes from the signed service token (restValidation)
    // or from the verified membership (users-auth middleware)

    const route = req.route?.path;
    const isInternalRoute = new RegExp(`^${WebServerConstants.BaseApiPathInternal}`).test(route);

    // the internal routes are served only when the services run in separate processes (SMALL_API_INTERNAL_ROUTES)
    // in one process the services call each other directly, so these routes are not reachable from outside
    // (the check uses the registered route, so it applies to every spelling of the url that reaches the route)
    if (isInternalRoute && process.env.SMALL_API_INTERNAL_ROUTES !== 'true') {
      const message = await RestMessagesUtils.statusError(404, new Error('Not found'), _ctx);
      res.status(404).json(message);
      return res.end();
    }

    // check if it requires s2s validation (internal routes /api/internal_v1/ + ones with s2s token)
    const s2sToken = req.headers['x-s2s-token'];
    const s2sValidation = isInternalRoute || s2sToken;
    if (!s2sValidation) {
      // no s2s needed
      return next();
    }

    try {
      const r = RestCommsUtils.restValidation(s2sToken, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error.error, _ctx);
        res.status(r.status).json(message);
        return res.end();
      }
    } catch (e) {
      console.log(`\nFailed to S2S authenticate request. Error: ${e.stack}`, _ctx);
      const message = await RestMessagesUtils.exception(e, _ctx);
      res.status(500).json(message);
      return res.end();
    }

    // s2s valid
    console.log(`\nRequest S2S authenticated ${route}`);
    next();
  },
};

module.exports = { ...Public };
