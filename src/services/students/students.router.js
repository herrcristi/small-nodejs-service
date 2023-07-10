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
router.route(`${StudentsConstants.StudentsApiPath}`).get(StudentsController.getAll);
router.route(`${StudentsConstants.StudentsApiPath}/:id`).get(StudentsController.getOne);

router.route(`${StudentsConstants.StudentsApiPath}`).post(StudentsController.post);
router.route(`${StudentsConstants.StudentsApiPath}/:id`).delete(StudentsController.delete);
router.route(`${StudentsConstants.StudentsApiPath}/:id`).put(StudentsController.put);
router.route(`${StudentsConstants.StudentsApiPath}/:id`).patch(StudentsController.patch);

module.exports = router;
