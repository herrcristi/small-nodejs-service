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
   * get all (internal) called from signup / invite by email
   * queryParams
   */
  getAll: async (queryParams, _ctx) => {
    return await RestCommsUtils.getAll(UsersConstants.ServiceNameInternal, queryParams, _ctx);
  },

  getAllByIDs: async (ids, projection, _ctx) => {
    return await RestCommsUtils.getAllByIDs(UsersConstants.ServiceNameInternal, ids, projection, _ctx);
  },

  /**
   * get one
   */
  getOne: async (objID, projection, _ctx) => {
    return await RestCommsUtils.getOne(UsersConstants.ServiceName, objID, projection, _ctx);
  },

  /**
   * get one (internal) called from users-auth
   */
  getOneByEmail: async (email, projection, _ctx) => {
    let queryParams = `email=${email}&limit=1`;
    if (projection) {
      queryParams += `&projection=${Object.keys(projection).join(',')}`;
    }
    const r = await Public.getAll(queryParams, _ctx);
    if (r.error) {
      return r;
    }
    if (!r.value.length) {
      const msg = `Not found ${email}`;
      return { status: 404, error: { message: msg, error: new Error(msg) }, time: r.time };
    }
    r.value = r.value[0];
    return r;
  },

  /**
   * post (internal) called from signup / invite
   */
  post: async (objInfo, _ctx) => {
    return await RestCommsUtils.post(UsersConstants.ServiceNameInternal, objInfo, _ctx);
  },

  /**
   * delete (internal) called from users-auth
   */
  delete: async (objID, _ctx) => {
    return await RestCommsUtils.delete(UsersConstants.ServiceNameInternal, objID, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    return await RestCommsUtils.put(UsersConstants.ServiceName, objID, objInfo, _ctx);
  },

  /**
   * put email (internal) called from users-auth
   */
  putEmail: async (objID, objInfo, _ctx) => {
    return await RestCommsUtils.put(UsersConstants.ServiceNameInternal, objID, objInfo, _ctx, 'email');
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    return await RestCommsUtils.patch(UsersConstants.ServiceName, objID, patchInfo, _ctx);
  },

  /**
   * patch school (internal) called from users-auth
   */
  patchSchool: async (objID, patchInfo, _ctx) => {
    return await RestCommsUtils.patch(UsersConstants.ServiceNameInternal, objID, patchInfo, _ctx, 'school');
  },

  /**
   * notification (is internal)
   * notification: { serviceName, added?, modified?, removed? }
   */
  notification: async (notification, _ctx) => {
    return await RestCommsUtils.notification(UsersConstants.ServiceNameInternal, notification, _ctx);
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
          newNotification[action] ??= [];
          newNotification[action].push({
            ...user,
            schools,
          });
        }
      }
    }

    console.log(`\nNotification filtered only to ${role} notifications: ${JSON.stringify(newNotification, null, 2)}`);
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

    console.log(`\nNotifications splitted by tenant: ${JSON.stringify(tenantNotifications, null, 2)}`);
    return tenantNotifications;
  },
};

module.exports = { ...Public, Constants: UsersConstants };
