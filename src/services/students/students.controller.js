/**
 * Students controller
 */

const BaseControllerUtils = require('../../core/utils/base-controller.utils.js');

const StudentsConstants = require('./students.constants.js');
const StudentsService = require('./students.service.js');

/**
 * controller functions called from router
 */
const Public = {
  getAll: async (req, res, next) => {
    await BaseControllerUtils.getAll(StudentsService, StudentsConstants.ServiceName, req, res, next);
  },

  getOne: async (req, res, next) => {
    await BaseControllerUtils.getOne(StudentsService, StudentsConstants.ServiceName, req, res, next);
  },

  post: async (req, res, next) => {
    await BaseControllerUtils.post(StudentsService, StudentsConstants.ServiceName, req, res, next);
  },

  delete: async (req, res, next) => {
    await BaseControllerUtils.delete(StudentsService, StudentsConstants.ServiceName, req, res, next);
  },

  put: async (req, res, next) => {
    await BaseControllerUtils.put(StudentsService, StudentsConstants.ServiceName, req, res, next);
  },

  patch: async (req, res, next) => {
    await BaseControllerUtils.patch(StudentsService, StudentsConstants.ServiceName, req, res, next);
  },
};

module.exports = { ...Public };
