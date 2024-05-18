/**
 * Base service
 */
const Joi = require('joi');

const CommonUtils = require('./common.utils.js');
const ReferencesUtils = require('./base-service.references.utils.js');

const Constants = {
  /**
   * notification
   */
  Notification: {
    Added: 'added',
    Modified: 'modified',
    Removed: 'removed',
  },
};

const SchemaNotificationsObjects = Joi.array().items(
  Joi.object()
    .keys({ id: Joi.string().min(1).max(64).required() })
    .unknown(true)
);
const Schema = {
  /**
   * notification schema
   */
  Notification: Joi.object().keys({
    serviceName: Joi.string().min(1).max(64).required(),
    added: SchemaNotificationsObjects,
    modified: SchemaNotificationsObjects,
    removed: SchemaNotificationsObjects,
  }),
};

const Public = {
  /**
   * raise notification and sync notify all subscribers
   * config: { ..., serviceName, subscribers: [{ callback, projection }] }
   * notificationType: Constants.Notification  - 'added', 'modified', 'removed'
   */
  raiseNotification: async (config, notificationType, objs, _ctx) => {
    const defaultProjection = {
      id: 1,
      name: 1,
      type: 1,
      status: 1,
      createdTimestamp: 1,
      lastModifiedTimestamp: 1,
      modifiedCount: 1,
    };

    for (const sub of config.subscribers || []) {
      let notifyObjs = [];
      for (const obj of objs) {
        const objProjected = CommonUtils.getProjectedObj(obj, sub.projection || defaultProjection);
        notifyObjs.push(objProjected);
      }

      const notification = {
        serviceName: config.serviceName,
        [notificationType]: notifyObjs,
      };

      console.log(`\n${config.serviceName}: Raise notification ${JSON.stringify(notification, null, 2)}`);

      // do a sync notification
      try {
        if (sub.callback) {
          await sub.callback(notification, _ctx);
        }
      } catch (e) {
        console.log(
          `\nError processing notification ${JSON.stringify(notification, null, 2)}. Error: ${CommonUtils.getLogError(
            e
          )}`
        );
      }
    }

    // do async notifications
    return await Public.broadcast(config, notificationType, objs, _ctx);
  },

  /**
   * broadcast to send async notifications (via an exchange)
   */
  broadcast: async (config, notificationType, objs, _ctx) => {
    // TODO impl
    return { status: 200, value: true };
  },

  /**
   * subscribe to receive async notifications (via a queue)
   * subscriber: {callback, projection }
   */
  consume: async (subscriber, _ctx) => {
    // TODO impl
    return { status: 200, value: true };
  },

  /**
   * notification schema
   */
  getNotificationSchema: () => {
    return Schema.Notification;
  },

  /**
   * process notification
   * config: { serviceName, collection, ..., references, fillReferences }
   * notification: { serviceName, added: [ { id, ... } ], removed, modified  }
   * returns: { status, value } or { status, error }
   */
  notification: async (config, notification, _ctx) => {
    if (!config.fillReferences) {
      return { status: 200, value: null }; // skipped
    }

    // apply changes to references
    return await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
  },
};

module.exports = { ...Public, Constants };
