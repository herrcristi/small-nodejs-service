/**
 * Router
 */

const express = require('express');

const UsersAuthConstants = require('./users-auth.constants.js');
const UsersAuthController = require('./users-auth.controller.js');
const UsersAuthSignupController = require('./users-auth.signup.controller.js');

const router = express.Router();

/**
 * Users Auth
 */
router.route(`${UsersAuthConstants.ApiPath}/login`).post(UsersAuthController.login); // public dont require authentication
router.route(`${UsersAuthConstants.ApiPath}/logout`).post(UsersAuthController.logout);
router.route(`${UsersAuthConstants.ApiPath}/signup`).post(UsersAuthSignupController.signup);
router.route(`${UsersAuthConstants.ApiPath}/invite`).post(UsersAuthSignupController.invite);

router.route(`${UsersAuthConstants.ApiPath}/:id/password`).put(UsersAuthController.putPassword);
router.route(`${UsersAuthConstants.ApiPath}/:id/id`).put(UsersAuthController.putID);
router.route(`${UsersAuthConstants.ApiPath}/:id/password`).patch(UsersAuthController.patchPassword);
router.route(`${UsersAuthConstants.ApiPath}/:id/id`).patch(UsersAuthController.patchID);
router.route(`${UsersAuthConstants.ApiPath}/:id/school/user/:uid`).patch(UsersAuthController.patchUserSchool);
router.route(`${UsersAuthConstants.ApiPath}/:id`).delete(UsersAuthController.delete);

/**
 * Internal
 */
router.route(`${UsersAuthConstants.ApiPathInternal}`).post(UsersAuthController.post); // called from signup + invite user

router.route(`${UsersAuthConstants.ApiPathInternal}/validate`).get(UsersAuthController.validate); // called from middleware

router.route(`${UsersAuthConstants.ApiPathInternal}/notifications`).post(UsersAuthController.notification);

module.exports = router;
