/**
 * Users service
 */
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');
const RestCommsUtils = require('../../core/utils/rest-communications.utils.js');

const UsersConstants = require('../users/users.constants.js');

const Private = {
  /**
   * subscribers for notifications { callback, projection }
   */
  Subscribers: [],
};

const Public = {
  /**
   * get all
   * queryParams should contain `?`
   */
  getAll: async (queryParams, _ctx) => {
    return await RestCommsUtils.getAll(UsersConstants.ServiceName, queryParams, _ctx);
  },

  getAllByIDs: async (ids, projection, _ctx) => {
    return await RestCommsUtils.getAllByIDs(UsersConstants.ServiceName, ids, projection, _ctx);
  },

  /**
   * get one
   */
  getOne: async (objID, _ctx) => {
    return await RestCommsUtils.getOne(UsersConstants.ServiceName, objID, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    return await RestCommsUtils.post(UsersConstants.ServiceName, objInfo, _ctx);
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    return await RestCommsUtils.delete(UsersConstants.ServiceName, objID, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    return await RestCommsUtils.put(UsersConstants.ServiceName, objID, objInfo, _ctx);
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    return await RestCommsUtils.patch(UsersConstants.ServiceName, objID, patchInfo, _ctx);
  },

  /**
   * notification (is internal)
   */
  notification: async (notification, _ctx) => {
    return await RestCommsUtils.notification(UsersConstants.ServiceNameInternal, notification, _ctx);
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
    const config = { serviceName: UsersConstants.ServiceName, subscribers: Private.Subscribers };
    return await NotificationsUtils.raiseNotification(config, notificationType, objs, _ctx);
  },

  /**
   * user notification is filter only for coresponding school role
   * notification: { serviceName, added: [ { id, name, type, status, schools: [{id, roles}] } ], removed, modified  }
   */
  filterNotificationByRole: (notification, role, _ctx) => {
    // return a new notification
    let newNotification = {
      serviceName: notification.serviceName,
    };

    const actions = Object.values(NotificationsUtils.Constants.Notification); // ['added', 'modified', 'removed'];
    for (const action of actions) {
      const users = notification[action];
      newNotification[action] = [];

      // user: { id, name, type, status, schools: [{id, roles}] }
      for (const user of users || []) {
        let schools = [];

        for (const school of user.schools || []) {
          const filteredRoles = (school.roles || []).filter((item) => item === role);
          if (filteredRoles.length) {
            schools.push({
              ...school,
              roles: filteredRoles,
            });
          }
        }

        if (schools.length) {
          newNotification[action].push({
            ...user,
            schools,
          });
        }
      }
    }

    console.log(`Notification filtered only to ${role} notifications: ${JSON.stringify(newNotification, null, 2)}`);
    return newNotification;
  },

  /**
   * user notification is split by tenant
   * notification: { serviceName, added: [ { id, name, type, status, schools: [{id, roles}] } ], removed, modified  }
   */
  convertToTenantNotifications: (notification, _ctx) => {
    let tenantNotifications = [];

    const actions = Object.values(NotificationsUtils.Constants.Notification); // ['added', 'modified', 'removed'];
    for (const action of actions) {
      const users = notification[action];
      // user: { id, name, type, status, schools: [{id, roles}] }
      for (const user of users || []) {
        for (const school of user.schools || []) {
          const n = {
            tenantID: school.id,
            notification: {
              serviceName: notification.serviceName,
              [action]: [
                {
                  ...user,
                  schools: [school],
                },
              ],
            },
          };
          tenantNotifications.push(n);
        }
      }
    }

    console.log(`Notifications splitted by tenant: ${JSON.stringify(tenantNotifications, null, 2)}`);
    return tenantNotifications;
  },
};

module.exports = { ...Public, Constants: UsersConstants };
