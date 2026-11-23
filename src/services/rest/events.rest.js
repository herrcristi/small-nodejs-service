/**
 * Events service
 */
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');
const RestCommsUtils = require('../../core/utils/rest-communications.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');

const EventsConstants = require('../events/events.constants.js');

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
    return await RestCommsUtils.getAll(EventsConstants.ServiceName, queryParams, _ctx);
  },

  /**
   * get all by ids
   * options: the options of the read, built by the caller (like { readPreference })
   */
  getAllByIDs: async (ids, projection, _ctx, options) => {
    return await RestCommsUtils.getAllByIDs(EventsConstants.ServiceName, ids, projection, _ctx, options);
  },

  /**
   * get one
   */
  getOne: async (objID, projection, _ctx) => {
    return await RestCommsUtils.getOne(EventsConstants.ServiceName, objID, projection, _ctx);
  },

  /**
   * post (is internal)
   */
  post: async (objInfo, _ctx) => {
    return await RestCommsUtils.post(EventsConstants.ServiceNameInternal, objInfo, _ctx);
  },

  /**
   * raise event for action applied to an object
   */
  raiseEventForObject: async (serviceName, action, objTarget, objArg, _ctx, severity = undefined) => {
    const protectedArg = CommonUtils.protectData(objArg);
    const argText = JSON.stringify(protectedArg);
    const event = {
      severity: severity || EventsConstants.Severity.Informational,
      messageID: `${serviceName}.${action}`,
      target: { id: objTarget.id, name: objTarget.name, type: objTarget.type },
      args: [argText],
    };

    // the user who did it: the logged-in user, or the one of the context (the pending cleanup, the start); a public
    // form without a login (reset password) is anonymous
    const anonymous = EventsConstants.NoLoginUsers.Anonymous;
    event.user = _ctx.userID ? { id: _ctx.userID, username: _ctx.username } : { id: anonymous, username: anonymous };
    return await Public.post(event, _ctx);
  },

  /**
   * notification (is internal)
   * notification: { serviceName, added?, modified?, removed? }
   */
  notification: async (notification, _ctx) => {
    return await RestCommsUtils.notification(EventsConstants.ServiceNameInternal, notification, _ctx);
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
    const config = { serviceName: EventsConstants.ServiceName, subscribers: Private.Subscribers };
    return await NotificationsUtils.raiseNotification(config, notificationType, objs, _ctx);
  },
};

module.exports = { ...Public, Constants: EventsConstants };
