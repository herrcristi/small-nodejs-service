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
router.route(`${UsersConstants.ApiPath}/:id`).get(UsersController.getOne);

router.route(`${UsersConstants.ApiPath}`).post(UsersController.post);
router.route(`${UsersConstants.ApiPath}/:id`).delete(UsersController.delete);
router.route(`${UsersConstants.ApiPath}/:id`).put(UsersController.put);
router.route(`${UsersConstants.ApiPath}/:id`).patch(UsersController.patch);

/**
 * Internal
 */
router.route(`${UsersConstants.ApiPathInternal}`).get(UsersController.getAll);

router.route(`${UsersConstants.ApiPathInternal}/notifications`).post(UsersController.notification);

module.exports = router;
