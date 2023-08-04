/**
 * Events controller
 */

const BaseControllerUtils = require('../../core/utils/base-controller.utils.js');

const EventsConstants = require('./events.constants.js');
const EventsService = require('./events.service.js');

/**
 * controller functions called from router
 */
const Public = {
  getAll: async (req, res, next) => {
    await BaseControllerUtils.getAll(EventsService, EventsConstants.ServiceName, req, res, next);
  },

  getOne: async (req, res, next) => {
    await BaseControllerUtils.getOne(EventsService, EventsConstants.ServiceName, req, res, next);
  },

  post: async (req, res, next) => {
    await BaseControllerUtils.post(EventsService, EventsConstants.ServiceName, req, res, next);
  },
};

module.exports = { ...Public };
