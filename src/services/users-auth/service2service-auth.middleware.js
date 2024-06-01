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

    const route = req.route?.path;

    // check if it requires s2s validation (internal routes /api/internal_v1/ + ones with s2s token)
    const s2sToken = req.headers['x-s2s-token'];
    const s2sValidation = new RegExp(`^${WebServerConstants.BaseApiPathInternal}`).test(route) || s2sToken;
    if (!s2sValidation) {
      // no s2s needed
      return next();
    }

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
  },
};

module.exports = { ...Public };
