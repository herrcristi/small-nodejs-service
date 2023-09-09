/**
 * Students service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const TranslationsUtils = require('../../core/utils/translations.utils.js');

const EventsRest = require('../rest/events.rest.js');
const UsersRest = require('../rest/users.rest.js');
const StudentsRest = require('../rest/students.rest.js');
const StudentsConstants = require('./students.constants.js');
const StudentsDatabase = require('./students.database.js');

/**
 * validation
 */
const SchemaClasses = Joi.array().items(
  Joi.object().keys({
    id: Joi.string().min(1).max(64).required(),
  })
);

const Schema = {
  Student: Joi.object().keys({
    classes: SchemaClasses,
  }),
};

const Validators = {
  Post: Schema.Student.fork(['classes'], (x) => x.required() /*make required */).keys({
    id: Joi.string().min(1).max(64).required(),
    type: Joi.string().valid(StudentsConstants.Type),
  }),

  Put: Schema.Student,

  Patch: Joi.object().keys({
    // for patch allowed operations are add, remove, set
    set: Schema.Student,
    add: Joi.object().keys({
      classes: SchemaClasses,
    }),
    remove: Joi.object().keys({
      classes: SchemaClasses,
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
      serviceName: StudentsConstants.ServiceName,
      collection: await StudentsDatabase.collection(_ctx),
      translate: Public.translate,
      schema: Schema.Student,
      references: [{ fieldName: '', service: UsersRest, isArray: false, projection: { id: 1, name: 1 } }],
      fillReferences: false,
      events: { service: EventsRest },
      notifications: { service: StudentsRest, projection: null /*default*/ },
    };
    return config;
  },

  /**
   * user notification must be split in mutiple notifications due to school acting as tenant
   * notification: { serviceName, added: [ { id, ... } ], removed, modified  }
   */
  splitNotification: (notification, _ctx) => {
    let newNotifications = [];

    const actions = ['added', 'modified', 'removed'];
    let n = {
      ...notification,
    };
    for (const action of actions) {
      delete n[action];
    }

    // currently if a role is removed from an org the students entry will still be kept

    if (notification.serviceName === UsersRest.Constants?.ServiceName) {
      // user: { id, name, type, status, schools: [{id, roles}] }

      for (const action of actions) {
        const users = notification[action];
        for (const user of users || []) {
          let u = { ...user };
          delete u.schools;

          for (const school of user.schools || []) {
            for (const role of school.roles || []) {
              // only student accepted in this service
              if (role !== StudentsConstants.Type) {
                continue;
              }

              newNotifications.push({
                ...n,
                schoolID: school.id,
                [action]: [{ ...u }],
              });
            }
          }
        }
      }
    } else {
      newNotifications.push(notification);
    }

    console.log(`Notification converted to student notifications: ${JSON.stringify(newNotifications)}`);
    return newNotifications;
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
    objInfo.type = StudentsConstants.Type;

    const config = await Private.getConfig(_ctx);
    return await BaseServiceUtils.post({ ...config, schema: Validators.Post, fillReferences: true }, objInfo, _ctx);
  },

  postForUsers: async (users, _ctx) => {
    // check if already exists first
    const usersIDs = users.map((item) => item.id);
    let existingStudentsMap = {};
    if (usersIDs.length) {
      let r = await Public.getAllByIDs(usersIDs, { _id: 0, id: 1 }, _ctx);
      if (r.error) {
        return r;
      }
      r.value?.forEach((item) => (existingStudentsMap[item.id] = true));
    }

    let newUsersCount = 0;
    for (const user of users) {
      if (existingStudentsMap[user.id]) {
        console.log(`Skipping create student ${user.id}`);
        continue;
      }

      // create
      r = await Public.post(
        {
          id: user.id,
          classes: [],
        },
        _ctx
      );
      if (r.error) {
        return r;
      }
      newUsersCount++;
    }

    return { status: 200, value: newUsersCount };
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
   * notification: { serviceName, added: [ { id, ... } ], removed, modified  }
   */
  notification: async (notification, _ctx) => {
    // user notification must be split in mutiple notifications due to school acting as tenant
    const newNotifications = Private.splitNotification(notification, _ctx);
    for (const notif of newNotifications) {
      const nCtx = { ..._ctx, tenantID: notif.schoolID || _ctx.tenantID };
      let config = await Private.getConfig(nCtx);
      config = { ...config, fillReferences: true };

      // if there is user added create the corresponding entry for student
      if (notif.serviceName === UsersRest.Constants?.ServiceName) {
        const newUsers = (notif.added || []).concat(notif.modified || []);
        const rN = await Public.postForUsers(newUsers, nCtx);
        if (rN.error) {
          return rN;
        }
      }

      // process notification for specific tenant
      let n = { ...notif };
      delete n.schoolID;
      let r = await BaseServiceUtils.notification(config, n, nCtx);
      if (r.error) {
        return r;
      }
    }
    return { status: 200, value: true };
  },

  /**
   * translate
   */
  translate: async (obj, _ctx) => {
    const translations = {};
    return await TranslationsUtils.addTranslations(obj, translations, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: StudentsConstants,
};
