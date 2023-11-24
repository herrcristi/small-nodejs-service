/**
 * Router
 */

const express = require('express');

const SchedulesConstants = require('./schedules.constants.js');
const SchedulesController = require('./schedules.controller.js');

const router = express.Router();

/**
 * Schedules
 */
router.route(`${SchedulesConstants.ApiPath}`).get(SchedulesController.getAll);
router.route(`${SchedulesConstants.ApiPath}/:id`).get(SchedulesController.getOne);

router.route(`${SchedulesConstants.ApiPath}`).post(SchedulesController.post);
router.route(`${SchedulesConstants.ApiPath}/:id`).delete(SchedulesController.delete);
router.route(`${SchedulesConstants.ApiPath}/:id`).put(SchedulesController.put);
router.route(`${SchedulesConstants.ApiPath}/:id`).patch(SchedulesController.patch);

/**
 * Internal
 */
router.route(`${SchedulesConstants.ApiPathInternal}/notifications`).post(SchedulesController.notification);

module.exports = router;
