/**
 * Users service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');

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
  ),

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
   * returns { serviceName, collection, schema }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: UsersConstants.ServiceName,
      collection: await UsersDatabase.collection(_ctx),
      schema: Schema.User,
    };
    return config;
  },

  /**
   * get all schools data and fill the users
   */
  fillSchoolsInfo: async (resUsers, _ctx) => {
    // TODO implement schools notification and here onSchoolNotification instead of fill schools name and status
    if (resUsers.error) {
      return resUsers;
    }

    const users = resUsers.value.data || resUsers.value;

    // get all schools ids first
    let schoolsMap = {};
    for (const user of users) {
      for (const school of user.schools || []) {
        schoolsMap[school.id] = 1;
      }
    }

    let schoolsIDs = Object.keys(schoolsMap);
    if (!schoolsIDs.length) {
      console.log(`Skipping calling schools to fill info`);
      return resUsers;
    }

    // get all schools
    let rs = await SchoolsRest.getAllByIDs(schoolsIDs, { id: 1, name: 1, type: 1, status: 1 }, _ctx);
    if (rs.error) {
      return rs;
    }

    if (schoolsIDs.length != rs.value.length) {
      console.log(`Not all schools were found`);
    }

    schoolsMap = {};
    for (const school of rs.value) {
      schoolsMap[school.id] = school;
    }

    // update info
    for (let user of users) {
      for (let school of user.schools) {
        const schoolDetails = schoolsMap[school.id];
        if (schoolDetails) {
          school.name = schoolDetails.name;
          school.status = schoolDetails.status;
        }
      }
    }

    return resUsers;
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
    return await Private.fillSchoolsInfo(r, _ctx);
  },

  /**
   * get all
   * filter: { filter, projection, limit, skip, sort }
   * returns { status, value } or { status, error }
   */
  getAll: async (filter, _ctx) => {
    const config = await Private.getConfig(_ctx);
    let r = await BaseServiceUtils.getAll(config, filter, _ctx);
    return await Private.fillSchoolsInfo(r, _ctx);
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
    return await Private.fillSchoolsInfo(r, _ctx);
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
    objInfo.status = objInfo.status || UsersConstants.Status.Pending;
    objInfo.type = UsersConstants.Type;
    objInfo.name = `${objInfo.firstName} ${objInfo.lastName}`;

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

    // TODO implement add/remove schools/roles

    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.patch({ ...config, schema: Validators.Patch }, objID, patchInfo, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
};
