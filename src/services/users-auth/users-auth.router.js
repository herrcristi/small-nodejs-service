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
router.route(`${UsersAuthConstants.ApiPath}/login`).post(UsersAuthController.login);
router.route(`${UsersAuthConstants.ApiPath}/signup`).post(UsersAuthSignupController.signup);

router.route(`${UsersAuthConstants.ApiPath}/:id`).put(UsersAuthController.put); // requires authentication to change password
router.route(`${UsersAuthConstants.ApiPath}/:id`).patch(UsersAuthController.patch); // requires authentication to change password

router.route(`${UsersAuthConstants.ApiPath}`).post(UsersAuthController.post); //  requires authentication to signup + invite user
/**
 * Internal
 */
router.route(`${UsersAuthConstants.ApiPathInternal}/validate`).get(UsersAuthController.validate);

router.route(`${UsersAuthConstants.ApiPathInternal}/notifications`).post(UsersAuthController.notification);

module.exports = router;
