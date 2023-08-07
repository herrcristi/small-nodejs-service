/**
 * Router
 */

const express = require('express');

const EventsConstants = require('./events.constants.js');
const EventsController = require('./events.controller.js');

const router = express.Router();

/**
 * Events
 */
router.route(`${EventsConstants.ApiPath}`).get(EventsController.getAll);
router.route(`${EventsConstants.ApiPath}/:id`).get(EventsController.getOne);

/**
 * Internal
 */
router.route(`${EventsConstants.ApiPathInternal}`).post(EventsController.post);

router.route(`${EventsConstants.ApiPathInternal}/notifications`).post(EventsController.notification);

module.exports = router;
