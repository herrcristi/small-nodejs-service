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
const SchemaScheduleLocationAdd = Joi.array().items(
  Joi.object().keys({
    timestamp: Joi.string().isoDate().required(), // kept as an iso string (a date would be converted to a Date object)
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
const SchemaScheduleLocationRemove = Joi.array().items(
  Joi.object().keys({
    id: Joi.string().min(1).max(64).required(),
  })
);

const Schema = {
  Schedule: Joi.object().keys({
    name: Joi.string().trim().min(1).max(64), // without the spaces around it (only spaces: refused)
    status: Joi.string()
      .min(1)
      .max(64)
      .valid(...Object.values(SchedulesConstants.Status)),
    schedules: SchemaScheduleLocationAdd,
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
      'schedules.id',
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
    ['name', 'schedules', 'professors', 'groups', 'students'],
    (x) => x.required() /*make required */
  ).keys({
    class: Joi.string().min(1).max(64).required(), // class can be set only on post
    type: Joi.string().valid(SchedulesConstants.Type),
  }),

  Put: Schema.Schedule.min(1), // a change has at least one field

  Patch: Joi.object()
    .keys({
      // for patch allowed operations are set, add, remove
      set: Schema.Schedule,
      add: Joi.object().keys({
        schedules: SchemaScheduleLocationAdd,
        professors: SchemaProfessors,
        groups: SchemaGroups,
        students: SchemaStudents,
      }),
      remove: Joi.object().keys({
        schedules: SchemaScheduleLocationRemove,
        professors: SchemaProfessors,
        groups: SchemaGroups,
        students: SchemaStudents,
      }),
    })
    .min(1), // a change has at least one operation
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
          projection: {
            id: 1,
            name: 1,
            type: 1,
            status: 1,
            description: 1,
            credits: 1,
            required: 1,
            createdTimestamp: 1,
            modifiedCount: 1,
          },
        },
        {
          fieldName: 'schedules[].location',
          service: LocationsRest,
          projection: { id: 1, name: 1, type: 1, status: 1, address: 1, createdTimestamp: 1, modifiedCount: 1 },
        },
        {
          fieldName: 'professors[]',
          service: ProfessorsRest,
          projection: { id: 1, name: 1, type: 1, status: 1, user: 1, createdTimestamp: 1, modifiedCount: 1 },
        },
        {
          fieldName: 'groups[]',
          service: GroupsRest,
          projection: {
            id: 1,
            name: 1,
            type: 1,
            status: 1,
            description: 1,
            students: 1,
            createdTimestamp: 1,
            modifiedCount: 1,
          },
        },
        {
          fieldName: 'students[]',
          service: StudentsRest,
          projection: { id: 1, name: 1, type: 1, status: 1, user: 1, createdTimestamp: 1, modifiedCount: 1 },
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
   * generate and add inner schedules ids
   */
  addInnerSchedulesIDs: (objs, _ctx) => {
    for (const objInfo of objs) {
      for (const s of objInfo?.schedules || []) {
        s.id = s.id || CommonUtils.uuidc();
      }
    }
  },

  /**
   * notify the schedules that changed (modified): the students, professors and groups keep the class of their schedules
   * returns { status, value: [ ids ] } or { status, error }
   */
  notifyChangedSchedules: async (config, schedulesIDs, _ctx) => {
    if (!schedulesIDs.length) {
      return { status: 200, value: [] };
    }

    const projection = { ...config.notifications.projection, _id: 0 };
    const rSchedules = await DbOpsUtils.getAllByIDs(config, schedulesIDs, projection, _ctx);
    if (rSchedules.error) {
      return rSchedules;
    }

    console.log(`\n${SchedulesConstants.ServiceName}: notify the changed schedules ${JSON.stringify(schedulesIDs)}`);
    await SchedulesRest.raiseNotification(Private.Notification.Modified, rSchedules.value, _ctx);
    return { status: 200, value: schedulesIDs };
  },

  /**
   * classes notification: the copies of the classes in the schedules (class)
   * - modified: the copies are updated (only the older ones, modifiedCount)
   * - removed (the class was deleted): its copy keeps only its id (the schedules are notified)
   * (a class is given to a schedule by the edit of the schedule, not by a notification)
   * the schedules whose class changed are notified (the students, professors and groups keep the class of their schedules)
   * a failure is logged and the next classes are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onClassesNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const [classRef] = config.references; // class (the references: class, schedules[].location, professors[], groups[], students[])
    const changedSchedulesIDs = new Set();
    let failure = null; // the first failure (the next classes are still done)

    // the copies of the modified classes
    for (const schoolClass of notification[Private.Notification.Modified] || []) {
      const classCopy = CommonUtils.getProjectedObj(schoolClass, classRef.projection);
      const rCopies = await DbOpsUtils.updateManyReferences(config, classRef, classCopy, _ctx);
      if (rCopies.error) {
        console.log(
          `\n${SchedulesConstants.ServiceName}: failed to update the copies of the class ${schoolClass.id}: ${rCopies.error.message}`
        );
        failure ??= rCopies;
        continue;
      }
      rCopies.ids.forEach((id) => changedSchedulesIDs.add(id));
    }

    // the deleted classes
    for (const schoolClass of notification[Private.Notification.Removed] || []) {
      console.log(`\n${SchedulesConstants.ServiceName}: remove the deleted class ${schoolClass.id} from the schedules`);
      // the schedules that have it (they are notified)
      const rSchedules = await DbOpsUtils.getAllByReference(config, classRef, schoolClass.id, { _id: 0, id: 1 }, _ctx);
      if (rSchedules.error) {
        console.log(
          `\n${SchedulesConstants.ServiceName}: failed to remove the class ${schoolClass.id}: ${rSchedules.error.message}`
        );
        failure ??= rSchedules;
        continue;
      }
      rSchedules.value.forEach((item) => changedSchedulesIDs.add(item.id));

      const classCopy = CommonUtils.getProjectedObj(schoolClass, classRef.projection);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, classRef, classCopy, _ctx);
      if (rRemove.error) {
        console.log(
          `\n${SchedulesConstants.ServiceName}: failed to remove the class ${schoolClass.id}: ${rRemove.error.message}`
        );
        failure ??= rRemove;
      }
    }

    // the changed schedules are notified, also after a failure
    const rNotify = await Private.notifyChangedSchedules(config, [...changedSchedulesIDs], _ctx);
    return failure || rNotify;
  },

  /**
   * locations notification: the copies of the locations in the schedules (schedules[].location)
   * - modified: the copies are updated (only the older ones, modifiedCount)
   * - removed (the location was deleted): its copies keep only its id
   * (a location is given by the edit of the schedule)
   * nothing is notified (the other services do not keep the locations of the schedules)
   * a failure is logged and the next locations are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onLocationsNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const [, locationsRef] = config.references; // schedules[].location (the references: class, schedules[].location, professors[], groups[], students[])
    const changedSchedulesIDs = new Set();
    let failure = null; // the first failure (the next locations are still done)

    // the copies of the modified locations
    for (const location of notification[Private.Notification.Modified] || []) {
      const locationCopy = CommonUtils.getProjectedObj(location, locationsRef.projection);
      const rCopies = await DbOpsUtils.updateManyReferences(config, locationsRef, locationCopy, _ctx);
      if (rCopies.error) {
        console.log(
          `\n${SchedulesConstants.ServiceName}: failed to update the copies of the location ${location.id}: ${rCopies.error.message}`
        );
        failure ??= rCopies;
        continue;
      }
      rCopies.ids.forEach((id) => changedSchedulesIDs.add(id));
    }

    // the deleted locations
    for (const location of notification[Private.Notification.Removed] || []) {
      console.log(`\n${SchedulesConstants.ServiceName}: remove the deleted location ${location.id} from the schedules`);

      const locationCopy = CommonUtils.getProjectedObj(location, locationsRef.projection);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, locationsRef, locationCopy, _ctx);
      if (rRemove.error) {
        console.log(
          `\n${SchedulesConstants.ServiceName}: failed to remove the location ${location.id}: ${rRemove.error.message}`
        );
        failure ??= rRemove;
      }
    }

    return failure || { status: 200, value: [...changedSchedulesIDs] };
  },

  /**
   * professors notification: the copies of the professors in the schedules (professors[])
   * - modified: the copies are updated (only the older ones, modifiedCount)
   * - removed (the professor was deleted): it is removed from the schedules
   * (a professor is put in a schedule by the edit of the schedule, not by a notification)
   * nothing is notified (the other services do not keep the professors of the schedules)
   * a failure is logged and the next professors are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onProfessorsNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const [, , professorsRef] = config.references; // professors[] (the references: class, schedules[].location, professors[], groups[], students[])
    const changedSchedulesIDs = new Set();
    let failure = null; // the first failure (the next professors are still done)

    // the copies of the modified professors
    for (const professor of notification[Private.Notification.Modified] || []) {
      // a trace linked to the user invited again: its copies take its new id first
      if (professor.previousID) {
        const rID = await DbOpsUtils.updateManyReferencesID(
          config,
          professorsRef,
          professor.previousID,
          professor.id,
          _ctx
        );
        if (rID.error) {
          console.log(
            `\n${SchedulesConstants.ServiceName}: failed to link the copies of the professor ${professor.id}: ${rID.error.message}`
          );
          failure ??= rID;
          continue;
        }
        rID.ids.forEach((id) => changedSchedulesIDs.add(id));
      }

      const professorCopy = CommonUtils.getProjectedObj(professor, professorsRef.projection);
      const rCopies = await DbOpsUtils.updateManyReferences(config, professorsRef, professorCopy, _ctx);
      if (rCopies.error) {
        console.log(
          `\n${SchedulesConstants.ServiceName}: failed to update the copies of the professor ${professor.id}: ${rCopies.error.message}`
        );
        failure ??= rCopies;
        continue;
      }
      rCopies.ids.forEach((id) => changedSchedulesIDs.add(id));
    }

    // the deleted professors
    for (const professor of notification[Private.Notification.Removed] || []) {
      console.log(
        `\n${SchedulesConstants.ServiceName}: remove the deleted professor ${professor.id} from the schedules`
      );

      const professorCopy = CommonUtils.getProjectedObj(professor, professorsRef.projection);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, professorsRef, professorCopy, _ctx);
      if (rRemove.error) {
        console.log(
          `\n${SchedulesConstants.ServiceName}: failed to remove the professor ${professor.id}: ${rRemove.error.message}`
        );
        failure ??= rRemove;
      }
    }

    return failure || { status: 200, value: [...changedSchedulesIDs] };
  },

  /**
   * groups notification: the copies of the groups in the schedules (groups[])
   * - modified: the copies are updated (only the older ones, modifiedCount)
   * - removed (the group was deleted): it is removed from the schedules
   * (a group is put in a schedule by the edit of the schedule, not by a notification)
   * nothing is notified (the other services do not keep the groups of the schedules)
   * a failure is logged and the next groups are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onGroupsNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const [, , , groupsRef] = config.references; // groups[] (the references: class, schedules[].location, professors[], groups[], students[])
    const changedSchedulesIDs = new Set();
    let failure = null; // the first failure (the next groups are still done)

    // the copies of the modified groups
    for (const group of notification[Private.Notification.Modified] || []) {
      const groupCopy = CommonUtils.getProjectedObj(group, groupsRef.projection);
      const rCopies = await DbOpsUtils.updateManyReferences(config, groupsRef, groupCopy, _ctx);
      if (rCopies.error) {
        console.log(
          `\n${SchedulesConstants.ServiceName}: failed to update the copies of the group ${group.id}: ${rCopies.error.message}`
        );
        failure ??= rCopies;
        continue;
      }
      rCopies.ids.forEach((id) => changedSchedulesIDs.add(id));
    }

    // the deleted groups
    for (const group of notification[Private.Notification.Removed] || []) {
      console.log(`\n${SchedulesConstants.ServiceName}: remove the deleted group ${group.id} from the schedules`);

      const groupCopy = CommonUtils.getProjectedObj(group, groupsRef.projection);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, groupsRef, groupCopy, _ctx);
      if (rRemove.error) {
        console.log(
          `\n${SchedulesConstants.ServiceName}: failed to remove the group ${group.id}: ${rRemove.error.message}`
        );
        failure ??= rRemove;
      }
    }

    return failure || { status: 200, value: [...changedSchedulesIDs] };
  },

  /**
   * students notification: the copies of the students in the schedules (students[])
   * - modified: the copies are updated (only the older ones, modifiedCount)
   * - removed (the student was deleted): it is removed from the schedules
   * (a student is put in a schedule by the edit of the schedule, not by a notification)
   * nothing is notified (the other services do not keep the students of the schedules)
   * a failure is logged and the next students are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onStudentsNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const [, , , , studentsRef] = config.references; // students[] (the references: class, schedules[].location, professors[], groups[], students[])
    const changedSchedulesIDs = new Set();
    let failure = null; // the first failure (the next students are still done)

    // the copies of the modified students
    for (const student of notification[Private.Notification.Modified] || []) {
      // a trace linked to the user invited again: its copies take its new id first
      if (student.previousID) {
        const rID = await DbOpsUtils.updateManyReferencesID(config, studentsRef, student.previousID, student.id, _ctx);
        if (rID.error) {
          console.log(
            `\n${SchedulesConstants.ServiceName}: failed to link the copies of the student ${student.id}: ${rID.error.message}`
          );
          failure ??= rID;
          continue;
        }
        rID.ids.forEach((id) => changedSchedulesIDs.add(id));
      }

      const studentCopy = CommonUtils.getProjectedObj(student, studentsRef.projection);
      const rCopies = await DbOpsUtils.updateManyReferences(config, studentsRef, studentCopy, _ctx);
      if (rCopies.error) {
        console.log(
          `\n${SchedulesConstants.ServiceName}: failed to update the copies of the student ${student.id}: ${rCopies.error.message}`
        );
        failure ??= rCopies;
        continue;
      }
      rCopies.ids.forEach((id) => changedSchedulesIDs.add(id));
    }

    // the deleted students
    for (const student of notification[Private.Notification.Removed] || []) {
      console.log(`\n${SchedulesConstants.ServiceName}: remove the deleted student ${student.id} from the schedules`);

      const studentCopy = CommonUtils.getProjectedObj(student, studentsRef.projection);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, studentsRef, studentCopy, _ctx);
      if (rRemove.error) {
        console.log(
          `\n${SchedulesConstants.ServiceName}: failed to remove the student ${student.id}: ${rRemove.error.message}`
        );
        failure ??= rRemove;
      }
    }

    return failure || { status: 200, value: [...changedSchedulesIDs] };
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
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

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

    // add ids to inner schedules
    Private.addInnerSchedulesIDs([objInfo], _ctx);

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
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // populate references
    let rf = await ReferencesUtils.populateReferences({ ...config, fillReferences: true }, objInfo, _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    await Public.translate(objInfo, _ctx);

    // add ids to inner schedules
    Private.addInnerSchedulesIDs([objInfo], _ctx);

    // put
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for put
    await EventsRest.raiseEventForObject(SchedulesConstants.ServiceName, Private.Action.Put, r.value, objInfo, _ctx);

    // raise a notification for modified obj: it has the professors, groups and students of the schedule, so a removed
    // one loses only this schedule (the professors, groups and students that are not listed lose it)
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await SchedulesRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

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
      return CommonUtils.getSchemaValidationError(v, patchInfo, _ctx);
    }
    patchInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // populate references
    const configRef = { ...config, fillReferences: true };
    let rf = await ReferencesUtils.populateReferences(configRef, [patchInfo.set, patchInfo.add], _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    await Public.translate(patchInfo.set, _ctx);

    // add ids to inner schedules
    Private.addInnerSchedulesIDs([patchInfo.set, patchInfo.add], _ctx);

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

    // raise a notification for modified obj: it has the professors, groups and students of the schedule, so a removed
    // one loses only this schedule (the professors, groups and students that are not listed lose it)
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await SchedulesRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * notification: the copies kept by the schedules follow the changes of their sources (each source has its own flow)
   * - classes: the class copies (the schedules whose class changed are notified)
   * - locations: the location copies of the inner schedules
   * - professors, groups, students: their copies (a deleted one is removed)
   * notification: { serviceName, added?, modified?, removed? }
   */
  notification: async (notification, _ctx) => {
    // validate
    const v = NotificationsUtils.getNotificationSchema().validate(notification);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, notification, _ctx);
    }
    notification = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    switch (notification.serviceName) {
      case ClassesRest.Constants.ServiceName:
        return await Private.onClassesNotification(notification, _ctx);
      case LocationsRest.Constants.ServiceName:
        return await Private.onLocationsNotification(notification, _ctx);
      case ProfessorsRest.Constants.ServiceName:
        return await Private.onProfessorsNotification(notification, _ctx);
      case GroupsRest.Constants.ServiceName:
        return await Private.onGroupsNotification(notification, _ctx);
      case StudentsRest.Constants.ServiceName:
        return await Private.onStudentsNotification(notification, _ctx);
      default:
        console.log(
          `\n${SchedulesConstants.ServiceName}: notification of ${notification.serviceName} ignored (no copy of it)`
        );
        return { status: 200, value: false };
    }
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
