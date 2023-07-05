/**
 * Router
 */

const express = require('express');

const WebConstants = require('./web-server.constants.js');
const StudentsController = require('../controllers/students.controller.js');

const router = express.Router();

/**
 * Students
 */
router.route(`${WebConstants.StudentsApiPath}`).get(StudentsController.getAll);

module.exports = router;
