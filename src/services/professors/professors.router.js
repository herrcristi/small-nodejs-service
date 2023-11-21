/**
 * Router
 */

const express = require('express');

const ProfessorsConstants = require('./professors.constants.js');
const ProfessorsController = require('./professors.controller.js');

const router = express.Router();

/**
 * Professors
 */
router.route(`${ProfessorsConstants.ApiPath}`).get(ProfessorsController.getAll);
router.route(`${ProfessorsConstants.ApiPath}/:id`).get(ProfessorsController.getOne);

router.route(`${ProfessorsConstants.ApiPath}`).post(ProfessorsController.post);
router.route(`${ProfessorsConstants.ApiPath}/:id`).delete(ProfessorsController.delete);
router.route(`${ProfessorsConstants.ApiPath}/:id`).put(ProfessorsController.put);
router.route(`${ProfessorsConstants.ApiPath}/:id`).patch(ProfessorsController.patch);

/**
 * Internal
 */
router.route(`${ProfessorsConstants.ApiPathInternal}/notifications`).post(ProfessorsController.notification);

module.exports = router;
