/**
 * Request middleware
 */
const CommonUtils = require('../../core/utils/common.utils.js');
const UsersAuthRest = require('../rest/users-auth.rest.js');
const RestMessagesUtils = require('../../core/utils/rest-messages.utils.js');

const Public = {
  /**
   * Request middlware
   */
  middleware: async (req, res, next) => {
    const _ctx = req._ctx;

    const route = req.route?.path;

    // is whitelisted
    const whitelistRoutes = [
      `${UsersAuthRest.Constants.ApiPath}/login`,
      `${UsersAuthRest.Constants.ApiPathInternal}/validate`,
    ];

    if (whitelistRoutes.includes(route)) {
      console.log(`\nRoute whitelisted: ${route}`);
      return next();
    }

    try {
      const token = req.cookies[UsersAuthRest.Constants.AuthToken];

      const objValidation = {
        method: req.method.toUpperCase(),
        route,
        token,
        cookie: `${UsersAuthRest.Constants.AuthToken}=${token}`,
      };

      // _ctx: _userID, username;
      const r = await UsersAuthRest.validate(objValidation, _ctx);
      if (r.error) {
        res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error, _ctx));
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
