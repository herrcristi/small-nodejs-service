/**
 * Professors service
 */
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');
const RestCommsUtils = require('../../core/utils/rest-communications.utils.js');

const ProfessorsConstants = require('../professors/professors.constants.js');

const Private = {
  /**
   * subscribers for notifications { callback, projection }
   */
  Subscribers: [],
};

const Public = {
  /**
   * get all
   * queryParams
   */
  getAll: async (queryParams, _ctx) => {
    return await RestCommsUtils.getAll(ProfessorsConstants.ServiceName, queryParams, _ctx);
  },

  getAllByIDs: async (ids, projection, _ctx) => {
    return await RestCommsUtils.getAllByIDs(ProfessorsConstants.ServiceName, ids, projection, _ctx);
  },

  /**
   * get one
   */
  getOne: async (objID, projection, _ctx) => {
    return await RestCommsUtils.getOne(ProfessorsConstants.ServiceName, objID, projection, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    return await RestCommsUtils.post(ProfessorsConstants.ServiceName, objInfo, _ctx);
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    return await RestCommsUtils.delete(ProfessorsConstants.ServiceName, objID, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    return await RestCommsUtils.put(ProfessorsConstants.ServiceName, objID, objInfo, _ctx);
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    return await RestCommsUtils.patch(ProfessorsConstants.ServiceName, objID, patchInfo, _ctx);
  },

  /**
   * notification (is internal)
   * notification: { serviceName, added?, modified?, removed? }
   */
  notification: async (notification, _ctx) => {
    return await RestCommsUtils.notification(ProfessorsConstants.ServiceNameInternal, notification, _ctx);
  },

  /**
   * subscribe to receive sync notifications (this is called in the same service as the implementation)
   * subscriber: { callback, projection }
   */
  subscribe: async (subscriber, _ctx) => {
    Private.Subscribers.push(subscriber);
    return { status: 200, value: true };
  },

  /**
   * subscribe to receive async notifications (via a queue)
   * subscriber: { callback, projection }
   */
  consume: async (subscriber, _ctx) => {
    return await NotificationsUtils.consume(subscriber, _ctx);
  },

  /**
   * raise notification (sync + async)
   * notificationType: 'added', 'modified', 'removed'
   * subscribers: [{ callback, projection }]
   */
  raiseNotification: async (notificationType, objs, _ctx) => {
    const config = { serviceName: ProfessorsConstants.ServiceName, subscribers: Private.Subscribers };
    return await NotificationsUtils.raiseNotification(config, notificationType, objs, _ctx);
  },
};

module.exports = { ...Public, Constants: ProfessorsConstants };
