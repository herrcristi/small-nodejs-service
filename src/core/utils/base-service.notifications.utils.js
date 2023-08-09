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
   * config: { ..., serviceName, subscribers }
   * notificationType: Constants.Notification  - 'added', 'modified', 'removed'
   * subscribers: { service, projection }
   */
  raiseNotificationSync: async (config, notificationType, objs, _ctx) => {
    const defaultProjection = { id: 1, name: 1, type: 1, status: 1 };

    for (const sub of config.subscribers || []) {
      let notifyObjs = [];
      for (const obj of objs) {
        let objProjected = {};
        for (const field of sub.projection || defaultProjection) {
          objProjected[field] = obj[field];
        }
        notifyObjs.push(objProjected);
      }

      // do a sync notification
      let r = sub.service?.notification(
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
