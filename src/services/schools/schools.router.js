/**
 * Router
 */

const express = require('express');

const SchoolsConstants = require('./schools.constants.js');
const SchoolsController = require('./schools.controller.js');

const router = express.Router();

/**
 * Schools
 */
router.route(`${SchoolsConstants.ApiPath}`).get(SchoolsController.getAll);
router.route(`${SchoolsConstants.ApiPath}/:id`).get(SchoolsController.getOne);

router.route(`${SchoolsConstants.ApiPath}/:id`).delete(SchoolsController.delete);
router.route(`${SchoolsConstants.ApiPath}/:id`).put(SchoolsController.put);
router.route(`${SchoolsConstants.ApiPath}/:id`).patch(SchoolsController.patch);

/**
 * Internal
 */
router.route(`${SchoolsConstants.ApiPathInternal}`).post(SchoolsController.post); // not public, called only from signup

router.route(`${SchoolsConstants.ApiPathInternal}/notifications`).post(SchoolsController.notification);

module.exports = router;
