/**
 * Users controller
 */

const CommonUtils = require('../../core/utils/common.utils.js');
const RestMessagesUtils = require('../../core/utils/rest-messages.utils.js');

const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthSignupService = require('./users-auth.signup.service.js');

const Private = {
  /**
   * the answer for the user of an invite (or a signup): the same for a new user, an existing user and an existing
   * member, so it does not tell if an account exists, nor its id or name (the service returns the real result)
   */
  inviteAnswer: (r) => {
    return { username: r.value?.username, type: UsersAuthConstants.Type };
  },
};

/**
 * controller functions called from router
 */
const Public = {
  /**
   * signup
   */
  signup: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Signup called, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // signup (is a separate service)
      const r = await UsersAuthSignupService.signup(req.body, _ctx);
      if (r.error) {
        return res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error, _ctx));
      }

      // a school was created; its first admin is invited (the same answer for a new or an existing user)
      const answer = Private.inviteAnswer(r);
      res.status(201).json(answer);
    } catch (e) {
      return res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },

  /**
   * invite
   */
  invite: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Invite called, param ${JSON.stringify(
          CommonUtils.protectData(req.params),
          null,
          2
        )}, body ${JSON.stringify(CommonUtils.protectData(req.body), null, 2)}`
      );

      // invite (is a separate service)
      const r = await UsersAuthSignupService.invite(req.body, _ctx);
      if (r.error) {
        return res.status(r.status).json(await RestMessagesUtils.statusError(r.status, r.error, _ctx));
      }

      // the same answer for a new user, an existing user and an existing member
      const answer = Private.inviteAnswer(r);
      res.status(200).json(answer);
    } catch (e) {
      return res.status(500).json(await RestMessagesUtils.exception(e, _ctx));
    } finally {
      res.end();
    }
  },
};

module.exports = { ...Public };
