/**
 * Router
 */

const express = require('express');
const rateLimit = require('express-rate-limit');

const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthController = require('./users-auth.controller.js');
const UsersAuthSignupController = require('./users-auth.signup.controller.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const RateLimiterMiddleware = require('../../core/web-server/rate-limiter.middleware.js');

const router = express.Router();

// stricter limits for the public routes that guess passwords or send emails
// login: the failed logins of an account from one address, and from all addresses
const loginLimiter = rateLimit(RateLimiterMiddleware.loginLimiter);
const loginAccountLimiter = rateLimit(RateLimiterMiddleware.loginAccountLimiter);
// reset password: the emails sent to an account
const resetPasswordLimiter = rateLimit(RateLimiterMiddleware.resetPasswordLimiter);

/**
 * Users Auth
 */
router.route(`${UsersAuthConstants.ApiPath}/login`).post(loginLimiter, loginAccountLimiter, UsersAuthController.login); // public dont require authentication
router.route(`${UsersAuthConstants.ApiPath}/logout`).post(UsersAuthController.logout); // logout the current login user
router.route(`${UsersAuthConstants.ApiPath}/me`).get(UsersAuthController.getCurrentUser); // get current user (from cookie) - used on app bootstrap
//router.route(`${UsersAuthConstants.ApiPath}/signup`).post(UsersAuthSignupController.signup); // may be done by anonymous user
router
  .route(`${UsersAuthConstants.ApiPath}/reset-password`)
  .post(resetPasswordLimiter, UsersAuthController.resetPassword); // public dont require authentication

router.route(`${UsersAuthConstants.ApiPath}/reset-token/validate`).get(UsersAuthController.validateResetToken); // public dont require authentication only for local auth
router.route(`${UsersAuthConstants.ApiPath}/reset-token/password`).put(UsersAuthController.putResetPassword); // public dont require authentication only for local auth
// the link of an invitation: set up the account (the first password and the profile), public, only for local auth
router.route(`${UsersAuthConstants.ApiPath}/setup-token/validate`).get(UsersAuthController.validateSetupToken);
router.route(`${UsersAuthConstants.ApiPath}/setup-token/account`).put(UsersAuthController.putSetupAccount);

router.route(`${UsersAuthConstants.ApiPath}/invite`).post(UsersAuthSignupController.invite);
router.route(`${UsersAuthConstants.ApiPath}/signup`).post(UsersAuthSignupController.signup); // by portal admin

router.route(`${UsersAuthConstants.ApiPath}/password`).put(UsersAuthController.putPassword);
router.route(`${UsersAuthConstants.ApiPath}/id`).put(UsersAuthController.putID);
router.route(`${UsersAuthConstants.ApiPath}/password`).patch(UsersAuthController.patchPassword);
router.route(`${UsersAuthConstants.ApiPath}/id`).patch(UsersAuthController.patchID);
router.route(`${UsersAuthConstants.ApiPath}/school/user/:uid`).patch(UsersAuthController.patchUserSchool);
router.route(`${UsersAuthConstants.ApiPath}`).delete(UsersAuthController.delete);

/**
 * Internal
 */
router.route(`${UsersAuthConstants.ApiPathInternal}`).post(UsersAuthController.post); // called from signup + invite user

router.route(`${UsersAuthConstants.ApiPathInternal}/validate`).get(UsersAuthController.validate); // called from middleware

router.route(`${UsersAuthConstants.ApiPathInternal}/notifications`).post(UsersAuthController.notification);

module.exports = router;
