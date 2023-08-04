/**
 * Schools service
 */
const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');

const EventsRest = require('../rest/events.rest.js');
const SchoolsConstants = require('./schools.constants.js');
const SchoolsDatabase = require('./schools.database.js');

/**
 * validation
 */
const Schema = {
  School: Joi.object().keys({
    name: Joi.string().min(1).max(64),
    description: Joi.string().min(0).max(1024).allow(null),
    status: Joi.string()
      .min(1)
      .max(64)
      .valid(...Object.values(SchoolsConstants.Status)),
  }),
};

const Validators = {
  Post: Schema.School.fork(['name'], (x) => x.required() /*make required */),

  Put: Schema.School,

  Patch: Joi.object().keys({
    // for patch allowed operations are add, remove, set, unset
    set: Schema.School,
    unset: Joi.array().items(Joi.string().min(1).max(128).valid('description')),
  }),
};

const Private = {
  /**
   * config
   * returns { serviceName, collection, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: SchoolsConstants.ServiceName,
      collection: await SchoolsDatabase.collection(_ctx),
      schema: Schema.School,
      references: [], // to be populated (like foreign keys)
      fillReferences: false,
      events: { service: EventsRest },
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
    objInfo.type = SchoolsConstants.Type;
    objInfo.status = objInfo.status || SchoolsConstants.Status.Pending; // add default status if not set

    // TODO add translations

    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.post({ ...config, schema: Validators.Post }, objInfo, _ctx);
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.delete(config, objID, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    // TODO add translations for status

    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.put({ ...config, schema: Validators.Put }, objID, objInfo, _ctx);
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    // TODO add translations for status

    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.patch({ ...config, schema: Validators.Patch }, objID, patchInfo, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
};
