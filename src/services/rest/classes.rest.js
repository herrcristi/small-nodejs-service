/**
 * Classes service
 */
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');
const RestCommsUtils = require('../../core/utils/rest-communications.utils.js');

const ClassesConstants = require('../classes/classes.constants.js');

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
    return await RestCommsUtils.getAll(ClassesConstants.ServiceName, queryParams, _ctx);
  },

  getAllByIDs: async (ids, projection, _ctx) => {
    return await RestCommsUtils.getAllByIDs(ClassesConstants.ServiceName, ids, projection, _ctx);
  },

  /**
   * get one
   */
  getOne: async (objID, projection, _ctx) => {
    return await RestCommsUtils.getOne(ClassesConstants.ServiceName, objID, projection, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    return await RestCommsUtils.post(ClassesConstants.ServiceName, objInfo, _ctx);
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    return await RestCommsUtils.delete(ClassesConstants.ServiceName, objID, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    return await RestCommsUtils.put(ClassesConstants.ServiceName, objID, objInfo, _ctx);
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    return await RestCommsUtils.patch(ClassesConstants.ServiceName, objID, patchInfo, _ctx);
  },

  /**
   * notification (is internal)
   */
  notification: async (notification, _ctx) => {
    return await RestCommsUtils.notification(ClassesConstants.ServiceNameInternal, notification, _ctx);
  },

  /**
   * subscribe to receive sync notifications (this is called in the same service as the implementation)
   * subscriber: {callback, projection }
   */
  subscribe: async (subscriber, _ctx) => {
    Private.Subscribers.push(subscriber);
    return { status: 200, value: true };
  },

  /**
   * subscribe to receive async notifications (via a queue)
   * subscriber: {callback, projection }
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
    const config = { serviceName: ClassesConstants.ServiceName, subscribers: Private.Subscribers };
    return await NotificationsUtils.raiseNotification(config, notificationType, objs, _ctx);
  },
};

module.exports = { ...Public, Constants: ClassesConstants };
