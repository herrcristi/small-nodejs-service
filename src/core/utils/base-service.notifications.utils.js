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

const SchemaNotificationsObjects = Joi.array()
  .items(
    Joi.object()
      .keys({ id: Joi.string().min(1).max(64).required() })
      .unknown(true)
  )
  .required();

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
   * config: { ..., serviceName, subscribers: [{ service, projection }] }
   * notificationType: Constants.Notification  - 'added', 'modified', 'removed'
   */
  raiseNotification: async (config, notificationType, objs, _ctx) => {
    const defaultProjection = { id: 1, name: 1, type: 1, status: 1 };

    for (const sub of config.subscribers || []) {
      let notifyObjs = [];
      for (const obj of objs) {
        const objProjected = CommonUtils.getProjectedObj(obj, sub.projection || defaultProjection);
        notifyObjs.push(objProjected);
      }

      // do a sync notification
      let r = sub.service.notification(
        {
          serviceName: config.serviceName,
          [notificationType]: notifyObjs,
        },
        _ctx
      );
      if (!r) {
        return r;
      }
    }

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
   */
  listen: async (projection, _ctx) => {
    // TODO impl
    return { status: 200, value: true };
  },

  /**
   * process notification
   * config: { serviceName, collection, ..., references, fillReferences }
   * notification: { added: [ { id, ... } ], removed, modified  }
   * returns: { status, value } or { status, error }
   */
  notification: async (config, notification, _ctx) => {
    if (!config.fillReferences) {
      return { status: 200, value: null }; // skipped
    }

    // validate
    const v = Schema.Notification.validate(notification);
    if (v.error) {
      const err = v.error.details[0].message;
      return { status: 400, error: { message: err, error: new Error(err) } };
    }

    // apply changes to references
    return await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
  },
};

module.exports = { ...Public, Constants };
