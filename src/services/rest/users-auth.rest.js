/**
 * Users service
 */
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');
const RestCommsUtils = require('../../core/utils/rest-communications.utils.js');

const UsersAuthConstants = require('../users-auth/users-auth.constants.js');

const Private = {
  /**
   * subscribers for notifications { callback, projection }
   */
  Subscribers: [],
};

const Public = {
  /**
   * login (public)
   * objInfo: { id, password }
   */
  login: async (objInfo, _ctx) => {
    const config = { serviceName: UsersAuthConstants.ServiceName, method: 'POST', path: '/login', body: objInfo };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * logout
   */
  logout: async (_ctx) => {
    const config = { serviceName: UsersAuthConstants.ServiceName, method: 'POST', path: '/logout', body: {} };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * signup
   * objInfo: { email, password, name, birthday, phoneNumber?, address, school: { name, description } },
   */
  signup: async (objInfo, _ctx) => {
    const config = { serviceName: UsersAuthConstants.ServiceName, method: 'POST', path: '/signup', body: objInfo };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * invite
   * objInfo: { email, school: { role } } - schoolID is _ctx.tenantID
   */
  invite: async (objID, objInfo, _ctx) => {
    const path = `/${objID}/invite`;
    const config = { serviceName: UsersAuthConstants.ServiceName, method: 'POST', path, body: objInfo };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * validate (internal) called from middleware
   */
  validate: async (objInfo, _ctx) => {
    return await RestCommsUtils.validate(
      UsersAuthConstants.ServiceNameInternal,
      objInfo,
      UsersAuthConstants.AuthToken,
      _ctx
    );
  },

  /**
   * post (internal) called from signup + invite user
   */
  post: async (objInfo, _ctx) => {
    return await RestCommsUtils.post(UsersAuthConstants.ServiceNameInternal, objInfo, _ctx);
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    return await RestCommsUtils.delete(UsersAuthConstants.ServiceName, objID, _ctx);
  },

  /**
   * put
   */
  putPassword: async (objID, objInfo, _ctx) => {
    return await RestCommsUtils.put(UsersAuthConstants.ServiceName, objID, objInfo, _ctx, 'password');
  },

  putID: async (objID, objInfo, _ctx) => {
    return await RestCommsUtils.put(UsersAuthConstants.ServiceName, objID, objInfo, _ctx, 'id');
  },

  /**
   * patch
   */
  patchPassword: async (objID, patchInfo, _ctx) => {
    return await RestCommsUtils.patch(UsersAuthConstants.ServiceName, objID, patchInfo, _ctx, 'password');
  },

  patchID: async (objID, patchInfo, _ctx) => {
    return await RestCommsUtils.patch(UsersAuthConstants.ServiceName, objID, patchInfo, _ctx, 'id');
  },

  /**
   * patch called by admin to add/remove user to school (_ctx.tenantID)
   * patchInfo: { roles }
   */
  patchUserSchool: async (adminID, userID, patchInfo, _ctx) => {
    return await RestCommsUtils.patchUserSchool(UsersAuthConstants.ServiceName, adminID, userID, patchInfo, _ctx);
  },

  /**
   * notification (internal)
   * notification: { serviceName, added?, modified?, removed? }
   */
  notification: async (notification, _ctx) => {
    return await RestCommsUtils.notification(UsersAuthConstants.ServiceNameInternal, notification, _ctx);
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
    const config = { serviceName: UsersAuthConstants.ServiceName, subscribers: Private.Subscribers };
    return await NotificationsUtils.raiseNotification(config, notificationType, objs, _ctx);
  },
};

module.exports = { ...Public, Constants: UsersAuthConstants };
