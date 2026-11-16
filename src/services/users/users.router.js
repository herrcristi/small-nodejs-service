/**
 * Router
 */

const express = require('express');

const UsersConstants = require('./users.constants.js');
const UsersController = require('./users.controller.js');

const router = express.Router();

/**
 * Users
 */
router.route(`${UsersConstants.ApiPath}`).get(UsersController.getAll); // portal admins only
router.route(`${UsersConstants.ApiPath}/portal-admins`).get(UsersController.getPortalAdmins); // portal admins only
router.route(`${UsersConstants.ApiPath}/school-admins/:schoolId`).get(UsersController.getSchoolAdmins); // portal admins only
router.route(`${UsersConstants.ApiPath}/:id`).get(UsersController.getOne);
router.route(`${UsersConstants.ApiPath}/:id`).put(UsersController.put);
router.route(`${UsersConstants.ApiPath}/:id`).patch(UsersController.patch);
router.route(`${UsersConstants.ApiPath}/:id/status`).put(UsersController.putStatus); // portal admins only
router.route(`${UsersConstants.ApiPath}/:id/status`).patch(UsersController.patchStatus); // portal admins only

/**
 * Internal
 */
router.route(`${UsersConstants.ApiPathInternal}`).get(UsersController.getAllInternal); // called from signup / invite by email
router.route(`${UsersConstants.ApiPathInternal}`).post(UsersController.post); // called from signup / invite
router.route(`${UsersConstants.ApiPathInternal}/:id`).delete(UsersController.delete); // called from users-auth
router.route(`${UsersConstants.ApiPathInternal}/:id/activate`).post(UsersController.activate); // called from users-auth at login
router.route(`${UsersConstants.ApiPathInternal}/:id/email`).put(UsersController.putEmail); // called from users-auth to change only email
router.route(`${UsersConstants.ApiPathInternal}/:id/school`).patch(UsersController.patchSchool); // caled by admin to add/remove user from school

router.route(`${UsersConstants.ApiPathInternal}/notifications`).post(UsersController.notification);

module.exports = router;
