/**
 * Schools controller
 */

const BaseControllerUtils = require('../../core/utils/base-controller.utils.js');

const SchoolsConstants = require('./schools.constants.js');
const SchoolsService = require('./schools.service.js');

/**
 * controller functions called from router
 */
const Public = {
  getAll: async (req, res, next) => {
    await BaseControllerUtils.getAll(SchoolsService, SchoolsConstants.ServiceName, req, res, next);
  },

  getOne: async (req, res, next) => {
    await BaseControllerUtils.getOne(SchoolsService, SchoolsConstants.ServiceName, req, res, next);
  },

  post: async (req, res, next) => {
    await BaseControllerUtils.post(SchoolsService, SchoolsConstants.ServiceName, req, res, next);
  },

  delete: async (req, res, next) => {
    await BaseControllerUtils.delete(SchoolsService, SchoolsConstants.ServiceName, req, res, next);
  },

  put: async (req, res, next) => {
    await BaseControllerUtils.put(SchoolsService, SchoolsConstants.ServiceName, req, res, next);
  },

  patch: async (req, res, next) => {
    await BaseControllerUtils.patch(SchoolsService, SchoolsConstants.ServiceName, req, res, next);
  },

  notification: async (req, res, next) => {
    await BaseControllerUtils.notification(SchoolsService, SchoolsConstants.ServiceName, req, res, next);
  },
};

module.exports = { ...Public };
