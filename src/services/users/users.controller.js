/**
 * Users controller
 */

const BaseControllerUtils = require('../../core/utils/base-controller.utils.js');

const UsersConstants = require('./users.constants.js');
const UsersService = require('./users.service.js');

/**
 * controller functions called from router
 */
const Public = {
  getAll: async (req, res, next) => {
    await BaseControllerUtils.getAll(UsersService, UsersConstants.ServiceName, req, res, next);
  },

  getOne: async (req, res, next) => {
    await BaseControllerUtils.getOne(UsersService, UsersConstants.ServiceName, req, res, next);
  },

  post: async (req, res, next) => {
    await BaseControllerUtils.post(UsersService, UsersConstants.ServiceName, req, res, next);
  },

  delete: async (req, res, next) => {
    await BaseControllerUtils.delete(UsersService, UsersConstants.ServiceName, req, res, next);
  },

  put: async (req, res, next) => {
    await BaseControllerUtils.put(UsersService, UsersConstants.ServiceName, req, res, next);
  },

  patch: async (req, res, next) => {
    await BaseControllerUtils.patch(UsersService, UsersConstants.ServiceName, req, res, next);
  },

  notification: async (req, res, next) => {
    await BaseControllerUtils.notification(UsersService, UsersConstants.ServiceName, req, res, next);
  },
};

module.exports = { ...Public };
