/**
 * Schedules service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const TranslationsUtils = require('../../core/utils/translations.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const ReferencesUtils = require('../../core/utils/base-service.references.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const EventsRest = require('../rest/events.rest.js');
const ClassesRest = require('../rest/classes.rest.js');
const LocationsRest = require('../rest/locations.rest.js');
const StudentsRest = require('../rest/students.rest.js');
const ProfessorsRest = require('../rest/professors.rest.js');
const GroupsRest = require('../rest/groups.rest.js');
const SchedulesRest = require('../rest/schedules.rest.js');

const SchedulesConstants = require('./schedules.constants.js');
const SchedulesDatabase = require('./schedules.database.js');

/**
 * validation
 */
const SchemaStudents = Joi.array().items(
  Joi.object().keys({
    id: Joi.string().min(1).max(64).required(),
  })
);
const SchemaProfessors = Joi.array().items(
  Joi.object().keys({
    id: Joi.string().min(1).max(64).required(),
  })
);
const SchemaGroups = Joi.array().items(
  Joi.object().keys({
    id: Joi.string().min(1).max(64).required(),
  })
);
const SchemaScheduleLocation = Joi.array().items(
  Joi.object().keys({
    timestamp: Joi.date().iso().required(),
    frequency: Joi.string()
      .min(1)
      .max(64)
      .valid(...Object.values(SchedulesConstants.Frequency))
      .required(),
    location: Joi.string().min(1).max(64).required(),
    status: Joi.string()
      .min(1)
      .max(64)
      .valid(...Object.values(SchedulesConstants.Status)),
  })
);

const Schema = {
  Schedule: Joi.object().keys({
    name: Joi.string().min(1).max(64),
    class: Joi.string().min(1).max(64),
    status: Joi.string()
      .min(1)
      .max(64)
      .valid(...Object.values(SchedulesConstants.Status)),
    schedules: SchemaScheduleLocation,
    professors: SchemaProfessors,
    groups: SchemaGroups,
    students: SchemaStudents,
  }),
};

const Validators = {
  Get: {
    filter: [
      'id',
      'name',
      'class.id',
      'class.name',
      'status',
      'schedules.location.id',
      'schedules.location.name',
      'professors.id',
      'professors.user.name',
      'groups.id',
      'groups.name',
      'students.id',
      'students.user.name',
    ], // some have index
    sort: { name: 1 },
  },

  Post: Schema.Schedule.fork(
    ['name', 'class', 'schedules', 'professors', 'groups', 'students'],
    (x) => x.required() /*make required */
  ).keys({
    type: Joi.string().valid(SchedulesConstants.Type),
  }),

  Put: Schema.Schedule,

  Patch: Joi.object().keys({
    // for patch allowed operations are set, add, remove
    set: Schema.Schedule,
    add: Joi.object().keys({
      schedules: SchemaScheduleLocation,
      professors: SchemaProfessors,
      groups: SchemaGroups,
      students: SchemaStudents,
    }),
    remove: Joi.object().keys({
      schedules: SchemaScheduleLocation,
      professors: SchemaProfessors,
      groups: SchemaGroups,
      students: SchemaStudents,
    }),
  }),
};

const Private = {
  Action: BaseServiceUtils.Constants.Action,
  Notification: NotificationsUtils.Constants.Notification,
  ResProjection: { ...BaseServiceUtils.Constants.DefaultProjection, class: 1 },

  /**
   * config
   * returns { serviceName, collection, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: SchedulesConstants.ServiceName,
      collection: await SchedulesDatabase.collection(_ctx),
      references: [
        {
          fieldName: 'class',
          service: ClassesRest,
          projection: { id: 1, name: 1, type: 1, status: 1, description: 1, credits: 1, required: 1 },
        },
        {
          fieldName: 'schedules[].location',
          service: LocationsRest,
          projection: { id: 1, name: 1, type: 1, status: 1, address: 1 },
        },
        {
          fieldName: 'professors[]',
          service: ProfessorsRest,
          projection: { id: 1, name: 1, type: 1, status: 1, user: 1 },
        },
        {
          fieldName: 'groups[]',
          service: GroupsRest,
          projection: { id: 1, name: 1, type: 1, status: 1, students: 1 },
        },
        {
          fieldName: 'students[]',
          service: StudentsRest,
          projection: { id: 1, name: 1, type: 1, status: 1, user: 1 },
        },
      ],
      notifications: {
        projection: {
          ...BaseServiceUtils.Constants.DefaultProjection,
          class: 1,
          schedules: 1,
          professors: 1,
          groups: 1,
          students: 1,
        },
      } /* for sync+async */,
    };
    return config;
  },

  /**
   * get error response for missing tenant
   */
  errorNoTenant: (_ctx) => {
    const msg = 'Missing tenant';
    console.log(`\nError: ${msg}`);
    return {
      status: 400,
      error: { message: msg, error: new Error(msg) },
    };
  },

  /**
   * get the difference that was removed
   */
  getDiff: (schedule, newSchedule) => {
    let scheduleDiff = {
      ...newSchedule,
      schedules: [],
      professors: [],
      groups: [],
      students: [],
    };

    // create maps
    let schedulesMap = {};
    let professorsMap = {};
    let groupsMap = {};
    let studentsMap = {};
    for (const s of newSchedule.schedules) {
      const key = `${s.timestamp}.${s.frequency}.${s.location.id}`;
      schedulesMap[key] = s;
    }
    for (const professor of newSchedule.professors) {
      professorsMap[professor.id] = professor;
    }
    for (const group of newSchedule.groups) {
      groupsMap[group.id] = group;
    }
    for (const student of newSchedule.students) {
      studentsMap[student.id] = student;
    }

    for (const s of schedule.schedules) {
      const key = `${s.timestamp}.${s.frequency}.${s.location.id}`;
      const newSchedule = schedulesMap[key];
      if (!newSchedule) {
        // the schedule was removed
        scheduleDiff.schedules.push(s);
        continue;
      }
    }
    for (const professor of schedule.professors) {
      const newProfessor = professorsMap[professor.id];
      if (!newProfessor) {
        // the professor was removed
        scheduleDiff.professors.push(professor);
        continue;
      }
    }
    for (const group of schedule.groups) {
      const newGroup = groupsMap[group.id];
      if (!newGroup) {
        // the group was removed
        scheduleDiff.groups.push(group);
        continue;
      }
    }
    for (const student of schedule.students) {
      const newStudent = studentsMap[student.id];
      if (!newStudent) {
        // the student was removed
        scheduleDiff.students.push(student);
        continue;
      }
    }

    return scheduleDiff;
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
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllForReq: async (req, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // convert query to mongo build filter: { filter, projection, limit, skip, sort }
    const rf = await RestApiUtils.buildFilterFromReq(req, Validators.Get, _ctx);
    if (rf.error) {
      return rf;
    }
    const filter = rf.value;

    // get all (and expanded too)
    let r = await Public.getAll(filter, _ctx);
    if (r.error) {
      return r;
    }

    // get corresponding count
    let rCount = await Public.getAllCount(filter, _ctx);
    if (rCount.error) {
      return rCount;
    }

    // success
    const metaInfo = RestApiUtils.getMetaInfo(filter, rCount.value, _ctx);
    return {
      status: metaInfo.status,
      value: {
        data: r.value,
        meta: metaInfo.meta,
      },
    };
  },

  /**
   * get all
   * filter: { filter?, projection?, limit?, skip?, sort? }
   * returns { status, value } or { status, error }
   */
  getAll: async (filter, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAll(config, filter, _ctx);
  },

  /**
   * get all count
   * filter: { filter? }
   * returns { status, value } or { status, error }
   */
  getAllCount: async (filter, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllCount(config, filter, _ctx);
  },

  /**
   * get all by ids
   * returns { status, value } or { status, error }
   */
  getAllByIDs: async (ids, projection, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllByIDs(config, ids, projection, _ctx);
  },

  /**
   * get one
   * returns { status, value } or { status, error }
   */
  getOne: async (objID, projection, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getOne(config, objID, projection, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    objInfo.type = SchedulesConstants.Type;
    objInfo.status = objInfo.status || SchedulesConstants.Status.Pending; // add default status if not set

    // validate
    const v = Validators.Post.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    // populate references
    let rf = await ReferencesUtils.populateReferences({ ...config, fillReferences: true }, objInfo, _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    await Public.translate(objInfo, _ctx);
    objInfo = CommonUtils.patch2obj(objInfo);

    // post
    const r = await DbOpsUtils.post(config, objInfo, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for post
    await EventsRest.raiseEventForObject(SchedulesConstants.ServiceName, Private.Action.Post, r.value, r.value, _ctx);

    // raise a notification for new obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await SchedulesRest.raiseNotification(Private.Notification.Added, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.delete(config, objID, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for delete
    await EventsRest.raiseEventForObject(SchedulesConstants.ServiceName, Private.Action.Delete, r.value, r.value, _ctx);

    // raise a notification for removed obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await SchedulesRest.raiseNotification(Private.Notification.Removed, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // validate
    const v = Validators.Put.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // need to take diff before and after and trigger notification for deleted changes
    const rget = await DbOpsUtils.getOne(config, objID, projection, _ctx);
    if (rget.error) {
      return rget;
    }

    // populate references
    let rf = await ReferencesUtils.populateReferences({ ...config, fillReferences: true }, objInfo, _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    await Public.translate(objInfo, _ctx);

    // put
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for put
    await EventsRest.raiseEventForObject(SchedulesConstants.ServiceName, Private.Action.Put, r.value, objInfo, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await SchedulesRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // take the difference and notify removed schedules, professors, groups, students
    let rdiff = { status: 200, value: Private.getDiff(rget.value, r.value) };
    if (Object.keys(rdiff.value.students).length) {
      let rp = BaseServiceUtils.getProjectedResponse(rdiff, config.notifications.projection /* for sync+async */, _ctx);
      let rndiff = await SchedulesRest.raiseNotification(Private.Notification.Removed, [rp.value], _ctx);
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // validate
    const v = Validators.Patch.validate(patchInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, patchInfo, _ctx);
    }

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // need to take diff before and after and trigger notification for deleted changes
    const rget = await DbOpsUtils.getOne(config, objID, projection, _ctx);
    if (rget.error) {
      return rget;
    }

    // populate references
    const configRef = { ...config, fillReferences: true };
    let rf = await ReferencesUtils.populateReferences(configRef, [patchInfo.set, patchInfo.add], _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    await Public.translate(patchInfo.set, _ctx);

    // patch
    const r = await DbOpsUtils.patch(config, objID, patchInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for patch
    await EventsRest.raiseEventForObject(
      SchedulesConstants.ServiceName,
      Private.Action.Patch,
      r.value,
      patchInfo,
      _ctx
    );

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await SchedulesRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // take the difference and notify removed schedules, professors, groups, students
    let rdiff = { status: 200, value: Private.getDiff(rget.value, r.value) };
    if (Object.keys(rdiff.value.students).length) {
      let rp = BaseServiceUtils.getProjectedResponse(rdiff, config.notifications.projection /* for sync+async */, _ctx);
      let rndiff = await SchedulesRest.raiseNotification(Private.Notification.Removed, [rp.value], _ctx);
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * notification
   * notification: { serviceName, added: [ { id, ... } ], removed, modified  }
   */
  notification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // validate
    const v = NotificationsUtils.getNotificationSchema().validate(notification);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, notification, _ctx);
    }

    // { serviceName, collection, references, fillReferences }
    const config = await Private.getConfig(_ctx);

    // notification (process references)
    return await NotificationsUtils.notification({ ...config, fillReferences: true }, notification, _ctx);
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
  Constants: SchedulesConstants,
};
