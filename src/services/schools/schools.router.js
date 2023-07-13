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
router.route(`${SchoolsConstants.SchoolsApiPath}`).get(SchoolsController.getAll);
router.route(`${SchoolsConstants.SchoolsApiPath}/:id`).get(SchoolsController.getOne);

router.route(`${SchoolsConstants.SchoolsApiPath}`).post(SchoolsController.post);
router.route(`${SchoolsConstants.SchoolsApiPath}/:id`).delete(SchoolsController.delete);
router.route(`${SchoolsConstants.SchoolsApiPath}/:id`).put(SchoolsController.put);
router.route(`${SchoolsConstants.SchoolsApiPath}/:id`).patch(SchoolsController.patch);

module.exports = router;
