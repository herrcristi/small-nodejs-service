/**
 * Router
 */

const express = require('express');

const AdminsConstants = require('./admins.constants.js');
const AdminsController = require('./admins.controller.js');

const router = express.Router();

/**
 * Admins
 */
router.route(`${AdminsConstants.ApiPath}`).get(AdminsController.getAll);
router.route(`${AdminsConstants.ApiPath}/:id`).get(AdminsController.getOne);

router.route(`${AdminsConstants.ApiPath}`).post(AdminsController.post);
router.route(`${AdminsConstants.ApiPath}/:id`).delete(AdminsController.delete);
router.route(`${AdminsConstants.ApiPath}/:id`).put(AdminsController.put);
router.route(`${AdminsConstants.ApiPath}/:id`).patch(AdminsController.patch);

/**
 * Internal
 */
router.route(`${AdminsConstants.ApiPathInternal}/notifications`).post(AdminsController.notification);

module.exports = router;
