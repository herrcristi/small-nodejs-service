/**
 * Router
 */

const express = require('express');

const StudentsConstants = require('./students.constants.js');
const StudentsController = require('./students.controller.js');

const router = express.Router();

/**
 * Students
 */
router.route(`${StudentsConstants.ApiPath}`).get(StudentsController.getAll);
router.route(`${StudentsConstants.ApiPath}/:id`).get(StudentsController.getOne);

router.route(`${StudentsConstants.ApiPath}`).post(StudentsController.post);
router.route(`${StudentsConstants.ApiPath}/:id`).delete(StudentsController.delete);
router.route(`${StudentsConstants.ApiPath}/:id`).put(StudentsController.put);
router.route(`${StudentsConstants.ApiPath}/:id`).patch(StudentsController.patch);

module.exports = router;
