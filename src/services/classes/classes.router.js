/**
 * Router
 */

const express = require('express');

const ClassesConstants = require('./classes.constants.js');
const ClassesController = require('./classes.controller.js');

const router = express.Router();

/**
 * Classes
 */
router.route(`${ClassesConstants.ApiPath}`).get(ClassesController.getAll);
router.route(`${ClassesConstants.ApiPath}/:id`).get(ClassesController.getOne);

router.route(`${ClassesConstants.ApiPath}`).post(ClassesController.post);
router.route(`${ClassesConstants.ApiPath}/:id`).delete(ClassesController.delete);
router.route(`${ClassesConstants.ApiPath}/:id`).put(ClassesController.put);
router.route(`${ClassesConstants.ApiPath}/:id`).patch(ClassesController.patch);

/**
 * Internal
 */
router.route(`${ClassesConstants.ApiPathInternal}/notifications`).post(ClassesController.notification);

module.exports = router;
