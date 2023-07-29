/**
 * Students service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');

const UsersRest = require('../rest/users.rest.js');
const StudentsConstants = require('./students.constants.js');
const StudentsDatabase = require('./students.constants.js');

/**
 * validation
 */
const Schema = {
  Student: Joi.object().keys({
    id: Joi.string().min(1).max(64),
    classes: Joi.array().items(Joi.string().min(1).max(64)),
  }),
};

const Validators = {
  Post: Schema.Student.fork(['id', 'classes'], (x) => x.required() /*make required */),

  Put: Schema.Student,

  Patch: Joi.object().keys({
    // for patch allowed operations are add, remove, set
    set: Schema.Student,
    add: Joi.object().keys({
      classes: Joi.array().items(Joi.string().min(1).max(64)),
    }),
    remove: Joi.object().keys({
      classes: Joi.array().items(Joi.string().min(1).max(64)),
    }),
  }),
};

const Private = {
  /**
   * config
   * returns { serviceName, collection, schema }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: StudentsConstants.ServiceName,
      collection: await StudentsDatabase.collection(_ctx),
      schema: Schema.Student,
    };
    return config;
  },

  /**
   * get all users data and fill the students
   */
  fillUsersInfo: async (r, _ctx) => {
    // TODO implement users notification and here onUserNotification instead of fill users name and status
    if (r.error) {
      return r;
    }

    const students = r.value.data || r.value;
    const rb = await BaseServiceUtils.populate(students, '', SchoolsRest, _ctx);
    return rb.error ? rb : r;
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
    let r = await BaseServiceUtils.getAllForReq(config, req, _ctx);
    return await Private.fillUsersInfo(r, _ctx);
  },

  /**
   * get all
   * filter: { filter, projection, limit, skip, sort }
   * returns { status, value } or { status, error }
   */
  getAll: async (filter, _ctx) => {
    const config = await Private.getConfig(_ctx);
    let r = await BaseServiceUtils.getAll(config, filter, _ctx);
    return await Private.fillUsersInfo(r, _ctx);
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
    let r = await BaseServiceUtils.getAllByIDs(config, ids, projection, _ctx);
    return await Private.fillUsersInfo(r, _ctx);
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
    // add default status if not set
    objInfo.status = objInfo.status || StudentsConstants.Status.Pending;
    objInfo.type = StudentsConstants.Type;

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
    // TODO add translations

    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.put(config, objID, objInfo, _ctx);
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    // TODO add translations

    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.patch({ ...config, schema: Validators.Patch }, objID, patchInfo, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
};
