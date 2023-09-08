/**
 * Users service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const TranslationsUtils = require('../../core/utils/translations.utils.js');

const EventsRest = require('../rest/events.rest.js');
const UsersRest = require('../rest/users.rest.js');
const SchoolsRest = require('../rest/schools.rest.js');
const UsersConstants = require('./users.constants.js');
const UsersDatabase = require('./users.database.js');

/**
 * validation
 */
const SchemaSchools = Joi.array().items(
  Joi.object().keys({
    id: Joi.string().min(1).max(64).required(),
    roles: Joi.array().items(Joi.string().min(1).max(32).required()).min(1).required(),
  })
);

const Schema = {
  User: Joi.object().keys({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .min(1)
      .max(128),
    status: Joi.string()
      .min(1)
      .max(64)
      .valid(...Object.values(UsersConstants.Status)),
    firstName: Joi.string().min(1).max(64),
    lastName: Joi.string().min(1).max(64),
    birthday: Joi.date().iso(),
    phoneNumber: Joi.string()
      .min(1)
      .max(32)
      .regex(/^(\d|\+|\-|\.|' ')*$/), // allow 0-9 + - . in any order
    address: Joi.string().min(1).max(256),
    schools: SchemaSchools,
  }),
};

const Validators = {
  Post: Schema.User.fork(
    ['email', 'firstName', 'lastName', 'birthday', 'address', 'schools'],
    (x) => x.required() /*make required */
  ).keys({
    type: Joi.string().valid(UsersConstants.Type),
    name: Joi.string(),
  }),

  Put: Schema.User,

  Patch: Joi.object().keys({
    // for patch allowed operations are add, remove, set, unset
    set: Schema.User,
    unset: Joi.array().items(Joi.string().min(1).max(128).valid('phoneNumber')),
    add: Joi.object().keys({
      schools: SchemaSchools,
    }),
    remove: Joi.object().keys({
      schools: SchemaSchools,
    }),
  }),
};

const Private = {
  /**
   * config
   * returns { serviceName, collection, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: UsersConstants.ServiceName,
      collection: await UsersDatabase.collection(_ctx),
      translate: Public.translate,
      schema: Schema.User,
      references: [{ fieldName: 'schools', service: SchoolsRest, projection: null /*default*/ }],
      fillReferences: false,
      events: { service: EventsRest },
      notifications: { service: UsersRest, projection: null /*default*/ },
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
    objInfo.type = UsersConstants.Type;
    objInfo.status = objInfo.status || UsersConstants.Status.Pending; // add default status if not set
    objInfo.name = `${objInfo.firstName} ${objInfo.lastName}`;

    // TODO process roles

    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.post({ ...config, schema: Validators.Post, fillReferences: true }, objInfo, _ctx);
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
    // TODO if objInfo has firstName or lastName get obj and add the name too
    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.put(
      { ...config, schema: Validators.Put, fillReferences: true },
      objID,
      objInfo,
      _ctx
    );
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    // TODO if objInfo has firstName or lastName get obj and add the name too

    // TODO implement add/remove schools/roles

    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.patch(
      { ...config, schema: Validators.Patch, fillReferences: true },
      objID,
      patchInfo,
      _ctx
    );
  },

  /**
   * notification
   */
  notification: async (notification, _ctx) => {
    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.notification({ ...config, fillReferences: true }, notification, _ctx);
  },

  /**
   * translate
   */
  translate: async (obj, _ctx) => {
    const translations = {
      status: TranslationsUtils.string(obj?.status, _ctx),
    };
    return await TranslationsUtils.addTranslations(obj, translations, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: UsersConstants,
};
