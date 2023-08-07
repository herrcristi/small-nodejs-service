/**
 * Events service
 */

const RestCommsUtils = require('../../core/utils/rest-communications.utils.js');

const EventsConstants = require('../events/events.constants.js');

const Public = {
  /**
   * get all
   * queryParams should contain `?`
   */
  getAll: async (queryParams, _ctx) => {
    return await RestCommsUtils.getAll(EventsConstants.ServiceName, queryParams, _ctx);
  },

  getAllByIDs: async (ids, projection, _ctx) => {
    return await RestCommsUtils.getAllByIDs(EventsConstants.ServiceName, ids, projection, _ctx);
  },

  /**
   * get one
   */
  getOne: async (objID, _ctx) => {
    return await RestCommsUtils.getOne(EventsConstants.ServiceName, objID, _ctx);
  },

  /**
   * post (is internal)
   */
  post: async (objInfo, _ctx) => {
    return await RestCommsUtils.post(EventsConstants.ServiceNameInternal, objInfo, _ctx);
  },

  /**
   * notification (is internal)
   */
  notification: async (notification, _ctx) => {
    return await RestCommsUtils.notification(EventsConstants.ServiceNameInternal, notification, _ctx);
  },
};

module.exports = { ...Public, Constants: EventsConstants };
