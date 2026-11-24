/**
 * Schools service
 */

const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');
const RestCommsUtils = require('../../core/utils/rest-communications.utils.js');

const SchoolsConstants = require('../schools/schools.constants.js');

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
    return await RestCommsUtils.getAll(SchoolsConstants.ServiceName, queryParams, _ctx);
  },

  /**
   * get all by ids
   * options: { readPreference? } the options of the read, built by the caller
   */
  getAllByIDs: async (ids, projection, _ctx, options) => {
    return await RestCommsUtils.getAllByIDs(SchoolsConstants.ServiceName, ids, projection, _ctx, options);
  },

  /**
   * get one
   */
  getOne: async (objID, projection, _ctx) => {
    return await RestCommsUtils.getOne(SchoolsConstants.ServiceName, objID, projection, _ctx);
  },

  /**
   * post (internal) called only from signup
   */
  post: async (objInfo, _ctx) => {
    return await RestCommsUtils.post(SchoolsConstants.ServiceNameInternal, objInfo, _ctx);
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    return await RestCommsUtils.delete(SchoolsConstants.ServiceName, objID, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    return await RestCommsUtils.put(SchoolsConstants.ServiceName, objID, objInfo, _ctx);
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    return await RestCommsUtils.patch(SchoolsConstants.ServiceName, objID, patchInfo, _ctx);
  },

  /**
   * activate (internal) called from users-auth: a pending school becomes active, the others are not changed
   * returns the school with its current status
   */
  activate: async (objID, _ctx) => {
    const config = {
      serviceName: SchoolsConstants.ServiceNameInternal,
      method: 'POST',
      path: `/${objID}/activate`,
      body: {},
      localCall: { fn: 'activate', params: { objID } },
    };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * the settings of a school, with the default of the ones that are not set (the services of the members read
   * removedMembers when a role is removed); the schools service reads them on the primary
   * returns { status, value: settings } or { status, error }
   */
  getSettings: async (schoolID, _ctx) => {
    const config = {
      serviceName: SchoolsConstants.ServiceName,
      method: 'GET',
      path: `/${schoolID}/settings`,
      localCall: { fn: 'getSettings', params: { objID: schoolID } },
    };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * (internal) notification endpoint for sync processing
   * notification: { serviceName, added?, modified?, removed? }
   */
  notification: async (notification, _ctx) => {
    return await RestCommsUtils.notification(SchoolsConstants.ServiceNameInternal, notification, _ctx);
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
    const config = { serviceName: SchoolsConstants.ServiceName, subscribers: Private.Subscribers };
    return await NotificationsUtils.raiseNotification(config, notificationType, objs, _ctx);
  },
};

module.exports = { ...Public, Constants: SchoolsConstants };
