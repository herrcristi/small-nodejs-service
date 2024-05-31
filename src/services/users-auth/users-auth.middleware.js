/**
 * Request middleware
 */
const CommonUtils = require('../../core/utils/common.utils.js');
const RestMessagesUtils = require('../../core/utils/rest-messages.utils.js');
const RestCommsUtils = require('../../core/utils/rest-communications.utils.js');

const UsersAuthRest = require('../rest/users-auth.rest.js');
const WebServerConstants = require('../../web-server/web-server.constants.js');

const Public = {
  /**
   * Request middlware
   */
  middleware: async (req, res, next) => {
    const _ctx = req._ctx;

    const route = req.route?.path;

    // is whitelisted
    const whitelistRoutes = [`${UsersAuthRest.Constants.ApiPath}/login`];
    if (whitelistRoutes.includes(route)) {
      console.log(`\nRoute whitelisted: ${route}`);
      return next();
    }

    // check if it requires s2s validation (internal routes /api/internal_v1/ + ones with s2s token)
    const s2sToken = req.headers['x-s2s-token'];
    const s2sValidation = new RegExp(`^${WebServerConstants.BaseApiPathInternal}`).test(route) || s2sToken;
    if (s2sValidation) {
      try {
        const r = RestCommsUtils.restValidation(s2sToken, _ctx);
        if (r.error) {
          res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error.error, _ctx));
          return res.end();
        }
      } catch (e) {
        console.log(`\nFailed to S2S authenticate request. Error: ${e.stack}`, _ctx);
        res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
        return res.end();
      }

      // s2s valid
      console.log(`\nRequest S2S authenticated ${route}`);
      next();
      return;
    }

    // user authentication with token
    try {
      const token = req.cookies[UsersAuthRest.Constants.AuthToken];

      const objValidation = {
        method: req.method,
        route,
        token,
      };

      // _ctx: _userID, username;
      const r = await UsersAuthRest.validate(objValidation, _ctx);
      if (r.error) {
        res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error.error, _ctx));
        return res.end();
      }
    } catch (e) {
      console.log(`\nFailed to authenticate request. Error: ${e.stack}`, _ctx);
      res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
      return res.end();
    }

    // valid
    console.log(`\nRequest authenticated ${route}`);
    next();
  },
};

module.exports = { ...Public };
