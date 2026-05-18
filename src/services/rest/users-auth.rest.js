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
    const config = {
      serviceName: UsersAuthConstants.ServiceName,
      method: 'POST',
      path: '/login',
      body: objInfo,
      localCall: { fn: 'login', params: { objInfo } },
    };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * logout
   */
  logout: async (_ctx) => {
    const config = {
      serviceName: UsersAuthConstants.ServiceName,
      method: 'POST',
      path: '/logout',
      body: {},
      localCall: { fn: 'logout', params: {} },
    };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * signup
   * objInfo: { email, password, name, birthday, phoneNumber?, address, school: { name, description } },
   */
  signup: async (objInfo, _ctx) => {
    const config = {
      serviceName: UsersAuthConstants.ServiceName,
      method: 'POST',
      path: '/signup',
      body: objInfo,
      localCall: { fn: 'signup', params: { objInfo } },
    };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * invite
   * objInfo: { email, school: { role } } - schoolID is _ctx.tenantID
   */
  invite: async (objInfo, _ctx) => {
    const config = {
      serviceName: UsersAuthConstants.ServiceName,
      method: 'POST',
      path: '/invite',
      body: objInfo,
      localCall: { fn: 'invite', params: { objInfo } },
    };
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
    const config = {
      serviceName: UsersAuthConstants.ServiceNameInternal,
      method: 'POST',
      path: '',
      body: objInfo,
      localCall: { fn: 'post', params: { objInfo } },
    };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * delete
   */
  delete: async (_ctx) => {
    const config = {
      serviceName: UsersAuthConstants.ServiceName,
      method: 'DELETE',
      path: '',
      localCall: { fn: 'delete', params: {} },
    };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * put
   */
  putPassword: async (objInfo, _ctx) => {
    const config = {
      serviceName: UsersAuthConstants.ServiceName,
      method: 'PUT',
      path: `/password`,
      body: objInfo,
      localCall: { fn: 'putPassword', params: { objInfo } },
    };
    return await RestCommsUtils.call(config, _ctx);
  },

  putID: async (objInfo, _ctx) => {
    const config = {
      serviceName: UsersAuthConstants.ServiceName,
      method: 'PUT',
      path: `/id`,
      body: objInfo,
      localCall: { fn: 'putID', params: { objInfo } },
    };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * patch
   */
  patchPassword: async (patchInfo, _ctx) => {
    const config = {
      serviceName: UsersAuthConstants.ServiceName,
      method: 'PATCH',
      path: `/password`,
      body: patchInfo,
      localCall: { fn: 'patchPassword', params: { patchInfo } },
    };
    return await RestCommsUtils.call(config, _ctx);
  },

  patchID: async (patchInfo, _ctx) => {
    const config = {
      serviceName: UsersAuthConstants.ServiceName,
      method: 'PATCH',
      path: `/id`,
      body: patchInfo,
      localCall: { fn: 'patchID', params: { patchInfo } },
    };
    return await RestCommsUtils.call(config, _ctx);
  },

  /**
   * patch called by admin to add/remove user to school (_ctx.tenantID)
   * patchInfo: { roles }
   */
  patchUserSchool: async (adminID, userID, patchInfo, _ctx) => {
    const config = {
      serviceName: UsersAuthConstants.ServiceName,
      method: 'PATCH',
      path: `/school/user/${userID}`,
      body: patchInfo,
      localCall: { fn: 'patchUserSchool', params: { adminID, userID, patchInfo } },
    };
    return await RestCommsUtils.call(config, _ctx);
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
