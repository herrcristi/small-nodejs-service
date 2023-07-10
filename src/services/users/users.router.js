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
router.route(`${UsersConstants.UsersApiPath}`).get(UsersController.getAll);
// router.route(`${UsersConstants.UsersApiPath}/:id`).get(UsersController.getOne);

// router.route(`${UsersConstants.UsersApiPath}`).post(UsersController.post);
// router.route(`${UsersConstants.UsersApiPath}/:id`).delete(UsersController.delete);
// router.route(`${UsersConstants.UsersApiPath}/:id`).put(UsersController.put);
// router.route(`${UsersConstants.UsersApiPath}/:id`).patch(UsersController.patch);

module.exports = router;
