/**
 * Events service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');

const EventsRest = require('../rest/events.rest.js');
const EventsConstants = require('./events.constants.js');
const EventsDatabase = require('./events.database.js');

/**
 * validation
 */
const Schema = {
  Event: Joi.object().keys({
    severity: Joi.string().valid(...Object.values(BaseServiceUtils.Constants.Severity)),
    messageID: Joi.string().min(1).max(128),
    target: Joi.object().keys({
      id: Joi.string().min(1).max(64).required(),
      name: Joi.string().min(1).max(128).required(),
      type: Joi.string().min(1).max(64).required(),
    }),
    args: Joi.array().items(Joi.string().min(1).max(512)),
    user: Joi.object().keys({
      id: Joi.string().min(1).max(64).required(),
      name: Joi.string().min(1).max(128).required(),
    }),
  }),
};

const Validators = {
  Post: Schema.Event.fork(['severity', 'messageID', 'target', 'user'], (x) => x.required() /*make required */),
};

const Private = {
  /**
   * config
   * returns { serviceName, collection, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: EventsConstants.ServiceName,
      collection: await EventsDatabase.collection(_ctx),
      schema: Schema.Event,
      references: [],
      fillReferences: false,
      events: null,
      notifications: { service: EventsRest, projection: { severity: 1, messageID: 1, target: 1, args: 1, user: 1 } },
    };
    return config;
  },
};

const Public = {
  /**
   * init
   */
  init: async () => {},

  /**
   * get all for a request
   * req: { query }
   * returns { status, value: {data, meta} } or { status, error }
   */
  getAllForReq: async (req, _ctx) => {
    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.getAllForReq(config, req, _ctx);
  },

  /**
   * get all
   * filter: { filter, projection, limit, skip, sort }
   * returns { status, value } or { status, error }
   */
  getAll: async (filter, _ctx) => {
    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.getAll(config, filter, _ctx);
  },

  /**
   * get all count
   * filter: { filter }
   * returns { status, value } or { status, error }
   */
  getAllCount: async (filter, _ctx) => {
    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.getAllCount(config, filter, _ctx);
  },

  /**
   * get all by ids
   * returns { status, value } or { status, error }
   */
  getAllByIDs: async (ids, projection, _ctx) => {
    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.getAllByIDs(config, ids, projection, _ctx);
  },

  /**
   * get one
   * returns { status, value } or { status, error }
   */
  getOne: async (objID, projection, _ctx) => {
    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.getOne(config, objID, projection, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    objInfo.type = EventsConstants.Type;

    // TODO add translations
    objInfo.name = objInfo.messageID;

    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.post({ ...config, schema: Validators.Post, fillReferences: true }, objInfo, _ctx);
  },

  /**
   * notification
   */
  notification: async (notification, _ctx) => {
    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.notification({ ...config, fillReferences: true }, notification, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: EventsConstants,
};