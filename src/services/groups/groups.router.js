/**
 * Router
 */

const express = require('express');

const GroupsConstants = require('./groups.constants.js');
const GroupsController = require('./groups.controller.js');

const router = express.Router();

/**
 * Groups
 */
router.route(`${GroupsConstants.ApiPath}`).get(GroupsController.getAll);
router.route(`${GroupsConstants.ApiPath}/:id`).get(GroupsController.getOne);

router.route(`${GroupsConstants.ApiPath}`).post(GroupsController.post);
router.route(`${GroupsConstants.ApiPath}/:id`).delete(GroupsController.delete);
router.route(`${GroupsConstants.ApiPath}/:id`).put(GroupsController.put);
router.route(`${GroupsConstants.ApiPath}/:id`).patch(GroupsController.patch);

/**
 * Internal
 */
router.route(`${GroupsConstants.ApiPathInternal}/notifications`).post(GroupsController.notification);

module.exports = router;
