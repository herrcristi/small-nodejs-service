/**
 * Router
 */

const express = require('express');

const LocationsConstants = require('./locations.constants.js');
const LocationsController = require('./locations.controller.js');

const router = express.Router();

/**
 * Locations
 */
router.route(`${LocationsConstants.ApiPath}`).get(LocationsController.getAll);
router.route(`${LocationsConstants.ApiPath}/:id`).get(LocationsController.getOne);

router.route(`${LocationsConstants.ApiPath}`).post(LocationsController.post);
router.route(`${LocationsConstants.ApiPath}/:id`).delete(LocationsController.delete);
router.route(`${LocationsConstants.ApiPath}/:id`).put(LocationsController.put);
router.route(`${LocationsConstants.ApiPath}/:id`).patch(LocationsController.patch);

/**
 * Internal
 */
router.route(`${LocationsConstants.ApiPathInternal}/notifications`).post(LocationsController.notification);

module.exports = router;
