/**
 * users auth middleware
 */
const CommonUtils = require('../../core/utils/common.utils.js');
const RestMessagesUtils = require('../../core/utils/rest-messages.utils.js');
const RestCommsUtils = require('../../core/utils/rest-communications.utils.js');

const UsersAuthRest = require('../rest/users-auth.rest.js');
const WebServerConstants = require('../../web-server/web-server.constants.js');

const Public = {
  /**
   * users auth middleware
   */
  middleware: async (req, res, next) => {
    const _ctx = req._ctx;

    const route = req.route?.path;

    // skip internals
    if (new RegExp(`^${WebServerConstants.BaseApiPathInternal}`).test(route)) {
      return next();
    }

    // a call of another service on a public route: its token was validated (service-to-service middleware), its
    // identity and its school come from the token (the request of the user was authorized by the calling service)
    if (req.isS2SCall) {
      console.log(`\nService call ${route} for user ${_ctx.username} (${_ctx.userID}) for tenant ${_ctx.tenantID}`);
      return next();
    }

    // is whitelisted
    const whitelistRoutes = [
      `${UsersAuthRest.Constants.ApiPath}/login`,
      `${UsersAuthRest.Constants.ApiPath}/me`,
      `${UsersAuthRest.Constants.ApiPath}/reset-password`,
      `${UsersAuthRest.Constants.ApiPath}/reset-token/validate`,
      `${UsersAuthRest.Constants.ApiPath}/reset-token/password`,
    ];
    if (whitelistRoutes.includes(route)) {
      console.log(`\nRoute whitelisted: ${route}`);

      // nobody verified the tenant of this request (no membership check): do not use it, or an anonymous request
      // could write events into any school (and create collections for made up tenants)
      _ctx.tenantID = undefined;
      return next();
    }

    // user authentication with token
    try {
      const token = req.cookies[UsersAuthRest.Constants.AuthToken];

      const objValidation = {
        method: req.method,
        route,
        token,
      };

      // extract userID and username from token
      const r = await UsersAuthRest.validate(objValidation, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error.error, _ctx);
        res.status(r.status).json(message);
        return res.end();
      }

      // apply (the session id is the id of its record, for the logout)
      _ctx.userID = r.value.userID;
      _ctx.username = r.value.username;
      _ctx.tenantName = r.value.tenantName;
      _ctx.sessionID = r.value.sessionID;

      // a route without a school (all, current-user) called with a school that is not one of the user: it is not used, so
      // nothing is written into it (its events)
      if (!r.value.tenantVerified) {
        _ctx.tenantID = undefined;
      }
    } catch (e) {
      console.log(`\nFailed to authenticate request. Error: ${e.stack}`, _ctx);
      const message = await RestMessagesUtils.exception(e, _ctx);
      res.status(401).json(message);
      return res.end();
    }

    // valid
    console.log(
      `\nRequest authenticated route ${route} for user ${_ctx.username} (${_ctx.userID}) for tenant ${_ctx.tenantName} (${_ctx.tenantID})`
    );
    next();
  },
};

module.exports = { ...Public };
