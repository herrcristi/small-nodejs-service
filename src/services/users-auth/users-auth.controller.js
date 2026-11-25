/**
 * Users controller
 */

const CommonUtils = require('../../core/utils/common.utils.js');
const RestMessagesUtils = require('../../core/utils/rest-messages.utils.js');

const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthService = require('./users-auth.service.js');
const UsersAuthAgreementsService = require('./users-auth.agreements.service.js');

const Private = {
  /**
   * options of the auth cookie (UsersAuthConstants.AuthCookie)
   * HttpOnly: the UI never reads the token; Secure: only over https (not in debug mode, where the API runs on http);
   * SameSite: lax by default (the UI and the API on the same site), none when they are on different sites
   * (SMALL_API_COOKIE_SAMESITE=none, which requires Secure)
   */
  cookieOptions: () => {
    const { Path, SameSiteValues, SameSiteDefault } = UsersAuthConstants.AuthCookie;
    const configured = process.env.SMALL_API_COOKIE_SAMESITE;
    const sameSite = SameSiteValues.includes(configured) ? configured : SameSiteDefault;
    const secure = !CommonUtils.isDebug() || sameSite === 'none';
    return { httpOnly: true, secure, sameSite, path: Path };
  },

  /**
   * the answer of a failed login: the same for every reason (invalid request, unknown account, wrong password,
   * disabled user), so it does not tell if an account exists; a server error stays a server error
   */
  loginError: (r) => {
    if (r.status >= 500) {
      return r;
    }
    const msg = 'Invalid username/password';
    return { status: 401, error: { message: msg, error: new Error(msg) } };
  },

  /**
   * set the session token as the cookie: it expires with the session (UsersAuthConstants.TokenExpiresIn)
   */
  setSessionCookie: (res, token) => {
    const options = Private.cookieOptions();
    const maxAge = UsersAuthConstants.TokenExpiresIn.session * 1000; // ms
    res.cookie(UsersAuthConstants.AuthToken, token, { ...options, maxAge });
  },

  /**
   * clear the session cookie (the same attributes, so the browser removes it)
   */
  clearSessionCookie: (res) => {
    const options = Private.cookieOptions();
    res.clearCookie(UsersAuthConstants.AuthToken, options);
  },
};

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
        const re = Private.loginError(r);
        const message = await RestMessagesUtils.statusError(re.status, re.error, _ctx);
        return res.status(re.status).json(message);
      }

      // set token as cookie
      Private.setSessionCookie(res, r.token);

      // browser will auto-send cookie with subsequent requests; token is not returned to client
      res.status(r.status).json({
        ...r.value,
      });
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(401).json(message);
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
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      // clear the session cookie
      Private.clearSessionCookie(res);

      // add token and expires to response due to CORS limitations
      res.status(r.status).json({
        ...r.value,
      });
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(401).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * get current user (from cookie)
   * called on app bootstrap to restore session after page refresh
   */
  getCurrentUser: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      // get token from cookie
      const token = req.cookies[UsersAuthConstants.AuthToken];
      if (!token) {
        const message = await RestMessagesUtils.notAuthorized('No auth token', _ctx);
        return res.status(401).json(message);
      }

      // validate token and get user details (use a route allowed for all)
      const r = await UsersAuthService.validate(
        { token, method: 'GET', route: `${UsersAuthConstants.ApiPath}/me` },
        _ctx
      );
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      // the schools can be added after the login (like a new school or an invitation), make the pending ones active
      // as at login; a school that can not be activated stays pending (logged) and is tried again at the next refresh
      await UsersAuthService.activatePendingSchools(r.value, _ctx);

      // return current user data (will be used to restore auth store on bootstrap and when the schools are listed)
      res.status(200).json({
        userID: r.value.userID,
        username: r.value.username,
        name: r.value.name,
        language: r.value.language, // the language of the UI chosen by the user
        schools: r.value.schools || [],
        agreementsPending: r.value.agreementsPending || [], // the agreements to accept before using the account
        expires: r.value.sessionExpiresAt, // when the session ends
      });
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(401).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * the agreements and their documents, in the language of the request (public)
   */
  getAgreements: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      // read at the start: always there
      const r = await UsersAuthAgreementsService.get(_ctx);
      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * the current user accepts the agreements (the versions that it read)
   */
  acceptAgreements: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(`\n${_ctx.serviceName}: Accept agreements called, body ${JSON.stringify(req.body, null, 2)}`);

      const r = await UsersAuthAgreementsService.accept(req.body, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
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
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(401).json(message);
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
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
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

      // delete
      const r = await UsersAuthService.delete(_ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      // the sessions of the account are ended: clear the session cookie
      Private.clearSessionCookie(res);

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * reset password
   */
  resetPassword: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Reset password called, body ${JSON.stringify(
          CommonUtils.protectData(req.body),
          null,
          2
        )}`
      );

      // reset password
      const r = await UsersAuthService.resetPassword(req.body, _ctx);

      // an unknown address gets the same answer as a known one (nothing is sent): the answer does not tell
      // if an account exists
      if (r.status === 404) {
        return res.status(200).json({ username: req.body.username, type: UsersAuthConstants.Type });
      }
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * reset token validate
   */
  validateResetToken: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(
        `\n${_ctx.serviceName}: Reset token validate called, query ${JSON.stringify(
          CommonUtils.protectData(req.query),
          null,
          2
        )}`
      );

      // check if reset token is still valid (it is sent in a header, never in the url)
      const resetToken = req.headers['x-reset-token'];
      const r = await UsersAuthService.validateResetToken({ token: resetToken }, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * put reset password using reset token
   */
  putResetPassword: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(`\n${_ctx.serviceName}: Put reset password called`);

      const resetToken = req.headers['x-reset-token'];

      // check reset token and reset password
      const r = await UsersAuthService.putResetPassword(resetToken, req.body, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * validate setup token: the link of an invitation can still be used (the token is sent in a header, never in the url)
   */
  validateSetupToken: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(`\n${_ctx.serviceName}: Setup token validate called`);

      const setupToken = req.headers['x-setup-token'];
      const r = await UsersAuthService.validateSetupToken({ token: setupToken }, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },

  /**
   * set up the account with the link of an invitation: the first password and the profile
   */
  putSetupAccount: async (req, res, next) => {
    let _ctx = req._ctx;
    _ctx.serviceName = UsersAuthConstants.ServiceName;

    try {
      console.log(`\n${_ctx.serviceName}: Put setup account called`);

      const setupToken = req.headers['x-setup-token'];
      const r = await UsersAuthService.putSetupAccount(setupToken, req.body, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
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

      // put
      const r = await UsersAuthService.putPassword(req.body, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      // the other sessions are ended: this one continues with a new token
      Private.setSessionCookie(res, r.token);

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
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

      // put
      const r = await UsersAuthService.putID(req.body, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      // clear the session cookie
      Private.clearSessionCookie(res);

      // add token and expires to response due to CORS limitations
      res.status(r.status).json({
        ...r.value,
      });
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
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

      // patch
      const r = await UsersAuthService.patchPassword(req.body, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      // the other sessions are ended: this one continues with a new token
      Private.setSessionCookie(res, r.token);

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
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

      // patch
      const r = await UsersAuthService.patchID(req.body, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      // clear the session cookie
      Private.clearSessionCookie(res);

      // add token and expires to response due to CORS limitations
      res.status(r.status).json({
        ...r.value,
      });
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
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
      const userID = req.params.uid;

      // patch
      const r = await UsersAuthService.patchUserSchool(userID, req.body, _ctx);
      if (r.error) {
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
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
        const message = await RestMessagesUtils.statusError(r.status, r.error, _ctx);
        return res.status(r.status).json(message);
      }

      res.status(r.status).json(r.value);
    } catch (e) {
      const message = await RestMessagesUtils.exception(e, _ctx);
      return res.status(500).json(message);
    } finally {
      res.end();
    }
  },
};

module.exports = { ...Public };
