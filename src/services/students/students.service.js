/**
 * Students service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils');
const TranslationsUtils = require('../../core/utils/translations.utils.js');
const CommonUtils = require('../../core/utils/common.utils');
const ReferencesUtils = require('../../core/utils/base-service.references.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const EventsRest = require('../rest/events.rest.js');
const UsersRest = require('../rest/users.rest.js');
const SchoolsRest = require('../rest/schools.rest.js');
const ClassesRest = require('../rest/classes.rest.js');
const GroupsRest = require('../rest/groups.rest.js');
const SchedulesRest = require('../rest/schedules.rest.js');
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
  Get: {
    filter: [
      'id',
      'user.id',
      'user.name',
      'user.email',
      'user.status',
      'status',
      'classes.id',
      'classes.name',
      'groups.id',
      'groups.name',
      'schedules.id',
      'schedules.name',
    ], // some have index
    sort: { 'user.name': 1 },
  },

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
  Action: {
    ...BaseServiceUtils.Constants.Action,
    Restore: 'restore', // a trace is a student again (the role was given again)
    Disable: 'disable', // the role was removed: the student is kept as a trace, disabled
    AccountDeleted: 'accountDeleted', // the account was deleted: the student is kept as a trace, deleted
  },
  Notification: NotificationsUtils.Constants.Notification,
  ResProjection: { ...BaseServiceUtils.Constants.DefaultProjection, user: 1, removedTimestamp: 1 },

  /**
   * config
   * returns { serviceName, collection, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: StudentsConstants.ServiceName,
      collection: await StudentsDatabase.collection(_ctx),
      references: [
        {
          fieldName: 'user',
          service: UsersRest,
          projection: { id: 1, name: 1, type: 1, status: 1, email: 1, createdTimestamp: 1, modifiedCount: 1 },
        },
        {
          fieldName: 'classes[]',
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
          fieldName: 'groups[]',
          service: GroupsRest,
          projection: { id: 1, name: 1, type: 1, description: 1, status: 1, createdTimestamp: 1, modifiedCount: 1 },
        },
        {
          fieldName: 'schedules[]',
          service: SchedulesRest,
          projection: { id: 1, name: 1, type: 1, status: 1, class: 1, createdTimestamp: 1, modifiedCount: 1 },
        },
      ],
      notifications: { projection: { ...BaseServiceUtils.Constants.DefaultProjection, user: 1 } } /* for sync+async */,
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
   * a reference of the config (the copies kept from another service: user, classes[], schedules[], ...)
   */
  getReference: (config, fieldName) => {
    return config.references.find((ref) => ref.fieldName === fieldName);
  },

  /**
   * change the status of a student: the status of its user while it has the role, or a trace (disabled: the role was
   * removed, deleted: the account was deleted; removedTimestamp: when); the translations of the status follow
   * statusInfo: { status, removedTimestamp }
   * event: the action of the event (null: no event, a change of the user has its own event in the users service)
   * returns { status, value } or { status, error }
   */
  putStudentStatus: async (config, studentID, statusInfo, event, _ctx) => {
    const changes = { ...statusInfo };
    await Public.translate(changes, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.put(config, studentID, changes, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for the status
    if (event) {
      const eventObj = { ...r.value, name: r.value.user?.name };
      await EventsRest.raiseEventForObject(StudentsConstants.ServiceName, event, eventObj, statusInfo, _ctx);
    }

    return r;
  },

  /**
   * delete a student: its record is deleted, with an event and a removed notification (the groups and the schedules remove it)
   * returns { status, value } or { status, error } (404 when there is no record)
   */
  deleteStudent: async (config, studentID, _ctx) => {
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.delete(config, studentID, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for delete
    const eventObj = { ...r.value, name: r.value.user?.name };
    await EventsRest.raiseEventForObject(StudentsConstants.ServiceName, Private.Action.Delete, eventObj, r.value, _ctx);

    // raise a notification for removed obj
    const rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    await StudentsRest.raiseNotification(Private.Notification.Removed, [rnp.value], _ctx);

    return r;
  },

  /**
   * notify the students that changed (modified): the groups and the schedules keep their copies of them
   * returns { status, value: [ ids ] } or { status, error }
   */
  notifyChangedStudents: async (config, studentsIDs, _ctx) => {
    if (!studentsIDs.length) {
      return { status: 200, value: [] };
    }

    const projection = { ...config.notifications.projection, _id: 0 };
    const rStudents = await DbOpsUtils.getAllByIDs(config, studentsIDs, projection, _ctx);
    if (rStudents.error) {
      return rStudents;
    }

    console.log(`\n${StudentsConstants.ServiceName}: notify the changed students ${JSON.stringify(studentsIDs)}`);
    await StudentsRest.raiseNotification(Private.Notification.Modified, rStudents.value, _ctx);
    return { status: 200, value: studentsIDs };
  },

  /**
   * save the students of the users that have the student role in the school (the users notification: added,
   * modified)
   * - a new student: its record is created, with the status of its user
   * - a student (also a trace of an earlier role that is a student again: an event): its status follows its user,
   *   and its user copy is updated when it is older than the user (modifiedCount)
   * the students whose status or user copy changed are notified (the groups and the schedules keep their copies of them)
   * users: [ { id, status, ... } ] (as notified by the users service)
   * returns { status, value } or { status, error }
   */
  saveStudentsOfUsers: async (users, _ctx) => {
    const config = await Private.getConfig(_ctx);
    const userRef = Private.getReference(config, 'user');

    // the students that exist already
    const usersIDs = users.map((user) => user.id);
    const existingProjection = { _id: 0, id: 1, status: 1, removedTimestamp: 1 };
    const rStudents = await DbOpsUtils.getAllByIDs(config, usersIDs, existingProjection, _ctx);
    if (rStudents.error) {
      return rStudents;
    }
    const studentsMap = {};
    for (const student of rStudents.value) {
      studentsMap[student.id] = student;
    }

    const changedStudentsIDs = new Set();
    for (const user of users) {
      const student = studentsMap[user.id];

      // a new student
      if (!student) {
        console.log(`\n${StudentsConstants.ServiceName}: create the student of the user ${user.id}`);
        const rPost = await Public.post({ id: user.id, classes: [] }, _ctx);
        if (rPost.error) {
          return rPost;
        }
        continue;
      }

      // its status follows its user (a trace that is a student again: an event)
      if (student.status !== user.status || student.removedTimestamp) {
        const event = student.removedTimestamp ? Private.Action.Restore : null;
        const statusInfo = { status: user.status, removedTimestamp: null };
        const rStatus = await Private.putStudentStatus(config, student.id, statusInfo, event, _ctx);
        if (rStatus.error) {
          return rStatus;
        }
        changedStudentsIDs.add(student.id);
      }

      // its user copy (only an older one)
      const userCopy = CommonUtils.getProjectedObj(user, userRef.projection);
      const rCopy = await DbOpsUtils.updateManyReferences(config, userRef, userCopy, _ctx);
      if (rCopy.error) {
        return rCopy;
      }
      rCopy.ids.forEach((id) => changedStudentsIDs.add(id));
    }

    return await Private.notifyChangedStudents(config, [...changedStudentsIDs], _ctx);
  },

  /**
   * the students of the users that are not students of the school anymore (the users notification, removed: the role
   * was removed, or the account was deleted)
   * - a user that never logged in (pending): its student is deleted (an invitation that was not used leaves nothing)
   * - otherwise by the setting of the school (removedMembers):
   *   keep: the student stays as a trace, disabled (the role was removed) or deleted (the account was deleted), with
   *   an event; it stays in the lists, groups and schedules
   *   delete: the student is deleted (the groups and the schedules remove it)
   * the students whose status or user copy changed are notified (the groups and the schedules keep their copies of them)
   * users: [ { id, status, ... } ] (as notified by the users service)
   * returns { status, value } or { status, error }
   */
  removeStudentsOfUsers: async (users, _ctx) => {
    const config = await Private.getConfig(_ctx);
    const userRef = Private.getReference(config, 'user');

    // the setting of the school
    const rSettings = await SchoolsRest.getSettings(_ctx.tenantID, _ctx);
    if (rSettings.error) {
      return rSettings;
    }
    const keepTraces = rSettings.value.removedMembers === SchoolsRest.Constants.Settings.RemovedMembers.Keep;

    const changedStudentsIDs = new Set();
    for (const user of users) {
      // deleted: an invitation that was not used, or by the setting of the school
      const neverJoined = user.status === UsersRest.Constants.Status.Pending;
      if (neverJoined || !keepTraces) {
        console.log(`\n${StudentsConstants.ServiceName}: delete the student ${user.id} (never joined: ${neverJoined})`);
        const rDelete = await Private.deleteStudent(config, user.id, _ctx);
        if (rDelete.error && rDelete.status !== 404) {
          return rDelete;
        }
        continue;
      }

      // a trace: disabled (the role was removed) or deleted (the account was deleted)
      const traceProjection = { _id: 0, id: 1, status: 1, removedTimestamp: 1 };
      const rStudent = await DbOpsUtils.getOne(config, user.id, traceProjection, _ctx);
      if (rStudent.status === 404) {
        continue;
      }
      if (rStudent.error) {
        return rStudent;
      }

      const accountDeleted = user.status === UsersRest.Constants.Status.Deleted;
      const traceStatus = accountDeleted ? UsersRest.Constants.Status.Deleted : UsersRest.Constants.Status.Disabled;
      if (rStudent.value.status !== traceStatus || !rStudent.value.removedTimestamp) {
        console.log(`\n${StudentsConstants.ServiceName}: keep the student ${user.id} as a trace, ${traceStatus}`);
        const removedTimestamp = rStudent.value.removedTimestamp || new Date().toISOString();
        const statusInfo = { status: traceStatus, removedTimestamp };
        const event = accountDeleted ? Private.Action.AccountDeleted : Private.Action.Disable;
        const rStatus = await Private.putStudentStatus(config, user.id, statusInfo, event, _ctx);
        if (rStatus.error) {
          return rStatus;
        }
        changedStudentsIDs.add(user.id);
      }

      // its user copy (only an older one)
      const userCopy = CommonUtils.getProjectedObj(user, userRef.projection);
      const rCopy = await DbOpsUtils.updateManyReferences(config, userRef, userCopy, _ctx);
      if (rCopy.error) {
        return rCopy;
      }
      rCopy.ids.forEach((id) => changedStudentsIDs.add(id));
    }

    return await Private.notifyChangedStudents(config, [...changedStudentsIDs], _ctx);
  },

  /**
   * users notification, split by school (the schools where the user has, or had, the student role):
   * - added, modified: the students are saved (created when missing, otherwise their status and their user copy)
   * - removed (the student role was removed, or the account was deleted): the students are kept as traces or
   *   deleted, by the setting of the school
   * returns { status, value } or { status, error }
   */
  onUsersNotification: async (notification, _ctx) => {
    const studentsNotification = UsersRest.filterNotificationByRole(notification, StudentsConstants.Type, _ctx);
    const schoolsNotifications = UsersRest.convertToTenantNotifications(studentsNotification, _ctx);

    for (const schoolNotification of schoolsNotifications) {
      const schoolCtx = { ..._ctx, tenantID: schoolNotification.tenantID };
      const usersNotification = schoolNotification.notification;

      // the users with the student role
      const addedUsers = usersNotification[Private.Notification.Added] || [];
      const modifiedUsers = usersNotification[Private.Notification.Modified] || [];
      const users = [...addedUsers, ...modifiedUsers];
      if (users.length) {
        const rSave = await Private.saveStudentsOfUsers(users, schoolCtx);
        if (rSave.error) {
          return rSave;
        }
      }

      // the users without the student role (or without an account)
      const removedUsers = usersNotification[Private.Notification.Removed] || [];
      if (removedUsers.length) {
        const rRemove = await Private.removeStudentsOfUsers(removedUsers, schoolCtx);
        if (rRemove.error) {
          return rRemove;
        }
      }
    }

    return { status: 200, value: true };
  },

  /**
   * classes notification: the copies of the classes in the students
   * - modified: the copies are updated (only the older ones, modifiedCount)
   * - removed (the class was deleted): the class is removed from the students
   * (a class is given to a student by the edit of the student, not by a notification)
   * returns { status, value } or { status, error }
   */
  onClassesNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const classesRef = Private.getReference(config, 'classes[]');

    // the copies of the modified classes
    for (const schoolClass of notification[Private.Notification.Modified] || []) {
      const classCopy = CommonUtils.getProjectedObj(schoolClass, classesRef.projection);
      const rCopies = await DbOpsUtils.updateManyReferences(config, classesRef, classCopy, _ctx);
      if (rCopies.error) {
        return rCopies;
      }
    }

    // the deleted classes
    for (const schoolClass of notification[Private.Notification.Removed] || []) {
      console.log(`\n${StudentsConstants.ServiceName}: remove the deleted class ${schoolClass.id} from the students`);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, classesRef, { id: schoolClass.id }, _ctx);
      if (rRemove.error) {
        return rRemove;
      }
    }

    return { status: 200, value: true };
  },

  /**
   * groups notification: a group is in the groups of its students (the students it lists)
   * - added, modified: the group is added to its students (the ones that do not have it yet), removed from the
   *   students that are not in it anymore (a student removed from it keeps its other groups), and its copies are
   *   updated (only the older ones, modifiedCount)
   * - removed (the group was deleted): the group is removed from all the students
   * returns { status, value } or { status, error }
   */
  onGroupsNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const groupsRef = Private.getReference(config, 'groups[]');

    const addedGroups = notification[Private.Notification.Added] || [];
    const modifiedGroups = notification[Private.Notification.Modified] || [];
    for (const group of [...addedGroups, ...modifiedGroups]) {
      const groupCopy = CommonUtils.getProjectedObj(group, groupsRef.projection);

      // the students of the group (a notification without them changes only the copies)
      if (Array.isArray(group.students)) {
        const groupStudentsIDs = group.students.map((student) => student.id);

        // added to its students
        const rAdd = await DbOpsUtils.addManyReferences(config, groupStudentsIDs, groupsRef, groupCopy, _ctx);
        if (rAdd.error) {
          return rAdd;
        }

        // removed from the students that are not in it anymore
        const otherStudents = { filter: { id: { $nin: groupStudentsIDs } } };
        const rRemove = await DbOpsUtils.deleteManyReferences(config, groupsRef, { id: group.id }, _ctx, otherStudents);
        if (rRemove.error) {
          return rRemove;
        }
      }

      // its copies
      const rCopies = await DbOpsUtils.updateManyReferences(config, groupsRef, groupCopy, _ctx);
      if (rCopies.error) {
        return rCopies;
      }
    }

    // the deleted groups
    for (const group of notification[Private.Notification.Removed] || []) {
      console.log(`\n${StudentsConstants.ServiceName}: remove the deleted group ${group.id} from the students`);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, groupsRef, { id: group.id }, _ctx);
      if (rRemove.error) {
        return rRemove;
      }
    }

    return { status: 200, value: true };
  },

  /**
   * schedules notification: a schedule is in the schedules of its students (the students it lists)
   * - added, modified: the schedule is added to its students (the ones that do not have it yet), removed from the
   *   students that are not in it anymore (a student removed from it keeps its other schedules), and its copies are
   *   updated (only the older ones, modifiedCount)
   * - removed (the schedule was deleted): the schedule is removed from all the students
   * returns { status, value } or { status, error }
   */
  onSchedulesNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const schedulesRef = Private.getReference(config, 'schedules[]');

    const addedSchedules = notification[Private.Notification.Added] || [];
    const modifiedSchedules = notification[Private.Notification.Modified] || [];
    for (const schedule of [...addedSchedules, ...modifiedSchedules]) {
      const scheduleCopy = CommonUtils.getProjectedObj(schedule, schedulesRef.projection);

      // the students of the schedule (a notification without them changes only the copies)
      if (Array.isArray(schedule.students)) {
        const scheduleStudentsIDs = schedule.students.map((student) => student.id);

        // added to its students
        const rAdd = await DbOpsUtils.addManyReferences(config, scheduleStudentsIDs, schedulesRef, scheduleCopy, _ctx);
        if (rAdd.error) {
          return rAdd;
        }

        // removed from the students that are not in it anymore
        const otherStudents = { filter: { id: { $nin: scheduleStudentsIDs } } };
        const rRemove = await DbOpsUtils.deleteManyReferences(
          config,
          schedulesRef,
          { id: schedule.id },
          _ctx,
          otherStudents
        );
        if (rRemove.error) {
          return rRemove;
        }
      }

      // its copies
      const rCopies = await DbOpsUtils.updateManyReferences(config, schedulesRef, scheduleCopy, _ctx);
      if (rCopies.error) {
        return rCopies;
      }
    }

    // the deleted schedules
    for (const schedule of notification[Private.Notification.Removed] || []) {
      console.log(`\n${StudentsConstants.ServiceName}: remove the deleted schedule ${schedule.id} from the students`);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, schedulesRef, { id: schedule.id }, _ctx);
      if (rRemove.error) {
        return rRemove;
      }
    }

    return { status: 200, value: true };
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

    objInfo.type = StudentsConstants.Type;

    // validate
    const v = Validators.Post.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys
    objInfo.user = objInfo.id;

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    // populate references
    let rf = await ReferencesUtils.populateReferences({ ...config, fillReferences: true }, objInfo, _ctx);
    if (rf.error) {
      return rf;
    }

    // the status of the student is the status of its user (pending until the first login)
    objInfo.status = objInfo.user?.status || UsersRest.Constants.Status.Pending;

    // translate
    await Public.translate(objInfo, _ctx);
    objInfo = CommonUtils.patch2obj(objInfo);

    // post
    const r = await DbOpsUtils.post(config, objInfo, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for post
    const eventObj = { ...r.value, name: r.value.user.name };
    await EventsRest.raiseEventForObject(StudentsConstants.ServiceName, Private.Action.Post, eventObj, r.value, _ctx);

    // raise a notification for new obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await StudentsRest.raiseNotification(Private.Notification.Added, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * delete: removes the student role of the user in the current school (the one way to remove a member: the user and
   * its other roles are kept); the student follows the removed role (the users notification): it stays as a trace or
   * it is deleted, by the setting of the school
   */
  delete: async (objID, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // a student of the school
    const config = await Private.getConfig(_ctx);
    const rget = await DbOpsUtils.getOne(config, objID, Private.ResProjection, _ctx);
    if (rget.error) {
      return rget;
    }

    // a trace (its role was already removed, or its account was deleted): it is deleted now, its references follow
    // (the removed notification)
    if (rget.value.removedTimestamp) {
      console.log(`\n${StudentsConstants.ServiceName}: delete the trace of the student ${objID}`);
      const rDelete = await Private.deleteStudent(config, objID, _ctx);
      if (rDelete.error) {
        return rDelete;
      }
      return BaseServiceUtils.getProjectedResponse(rget, Private.ResProjection, _ctx);
    }

    // remove the role
    const patchInfo = { remove: { schools: [{ id: _ctx.tenantID, roles: [StudentsConstants.Type] }] } };
    const rRole = await UsersRest.patchSchool(objID, patchInfo, _ctx);
    if (rRole.error) {
      return rRole;
    }

    // the student follows the removed role (done by the users notification; a student kept without its role by an
    // earlier version is done now)
    const user = { ...rget.value.user, id: objID };
    const rRemove = await Private.removeStudentsOfUsers([user], _ctx);
    if (rRemove.error) {
      return rRemove;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(rget, Private.ResProjection, _ctx);
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

    // populate references
    let rf = await ReferencesUtils.populateReferences({ ...config, fillReferences: true }, objInfo, _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    await Public.translate(objInfo, _ctx);

    // put
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for put
    const eventObj = { ...r.value, name: r.value.user.name };
    await EventsRest.raiseEventForObject(StudentsConstants.ServiceName, Private.Action.Put, eventObj, objInfo, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await StudentsRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

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

    // populate references
    const configRef = { ...config, fillReferences: true };
    let rf = await ReferencesUtils.populateReferences(configRef, [patchInfo.set, patchInfo.add], _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    await Public.translate(patchInfo.set, _ctx);

    // patch
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.patch(config, objID, patchInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for patch
    const eventO = { ...r.value, name: r.value.user.name };
    await EventsRest.raiseEventForObject(StudentsConstants.ServiceName, Private.Action.Patch, eventO, patchInfo, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await StudentsRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * notification: the copies kept by the students follow the changes of their sources (each source has its own flow)
   * - users: the students of the users with the student role (created, status, user copy), kept as traces or deleted
   *   when the role is removed
   * - classes: the class copies of the students
   * - groups: a group is in the groups of its students
   * - schedules: a schedule is in the schedules of its students
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
      case UsersRest.Constants.ServiceName:
        return await Private.onUsersNotification(notification, _ctx);
      case ClassesRest.Constants.ServiceName:
        return await Private.onClassesNotification(notification, _ctx);
      case GroupsRest.Constants.ServiceName:
        return await Private.onGroupsNotification(notification, _ctx);
      case SchedulesRest.Constants.ServiceName:
        return await Private.onSchedulesNotification(notification, _ctx);
      default:
        console.log(
          `\n${StudentsConstants.ServiceName}: notification of ${notification.serviceName} ignored (no copy of it)`
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
  Constants: StudentsConstants,
};
