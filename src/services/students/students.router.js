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

module.exports = router;
