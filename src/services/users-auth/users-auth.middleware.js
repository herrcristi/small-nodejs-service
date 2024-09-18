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

    // is whitelisted
    const whitelistRoutes = [
      `${UsersAuthRest.Constants.ApiPath}/login`,
      `${UsersAuthRest.Constants.ApiPath}/reset-password`,
      `${UsersAuthRest.Constants.ApiPath}/reset-token/validate`,
      `${UsersAuthRest.Constants.ApiPath}/reset-token/password`,
    ];
    if (whitelistRoutes.includes(route)) {
      console.log(`\nRoute whitelisted: ${route}`);
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
        res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error.error, _ctx));
        return res.end();
      }

      // apply
      _ctx.userID = r.value.userID;
      _ctx.username = r.value.username;
      _ctx.tenantName = r.value.tenantName;
    } catch (e) {
      console.log(`\nFailed to authenticate request. Error: ${e.stack}`, _ctx);
      res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
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
