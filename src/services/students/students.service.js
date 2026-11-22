/**
 * Students service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const ValidationUtils = require('../../core/utils/validation.utils.js');
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

  RelinkTraces: Joi.object().keys({
    email: ValidationUtils.email().required(),
    userID: Joi.string().min(1).max(64).required(),
  }),

  Put: Schema.Student.min(1), // a change has at least one field

  Patch: Joi.object()
    .keys({
      // for patch allowed operations are add, remove, set
      set: Schema.Student,
      add: Joi.object().keys({
        classes: SchemaClasses,
      }),
      remove: Joi.object().keys({
        classes: SchemaClasses,
      }),
    })
    .min(1), // a change has at least one operation
};

const Private = {
  Action: {
    ...BaseServiceUtils.Constants.Action,
    Relink: 'relink', // a trace of a deleted account is linked to the user invited again (its new id)
    Restore: 'restore', // a trace is a student again (the role was given again)
    Remove: 'remove', // the role was removed: the student is kept as a trace (its user is removed)
    AccountDeleted: 'accountDeleted', // the account was deleted: the student is kept as a trace (its user is deleted)
  },
  Notification: NotificationsUtils.Constants.Notification,
  ResProjection: { ...BaseServiceUtils.Constants.DefaultProjection, user: 1 },

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
   * a trace: the copy of a user that does not have the role anymore (deleted: the account was deleted, removed: the
   * role was removed); it stays in the lists, the groups and the schedules
   */
  isTrace: (user) => {
    return [UsersRest.Constants.Status.Deleted, UsersRest.Constants.Status.Removed].includes(user?.status);
  },

  /**
   * keep a student as a trace: the status of its user copy is deleted or removed (the other fields of the copy are kept),
   * with an event
   * returns { status, value } or { status, error }
   */
  putTraceStatus: async (config, studentID, status, _ctx) => {
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.put(config, studentID, { 'user.status': status }, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for the trace
    const event = status === UsersRest.Constants.Status.Deleted ? Private.Action.AccountDeleted : Private.Action.Remove;
    const eventObj = { ...r.value, name: r.value.user?.name };
    await EventsRest.raiseEventForObject(StudentsConstants.ServiceName, event, eventObj, { status }, _ctx);

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
   * save the students of the users that have the student role in the school (the users notification: added, modified)
   * - a new student: its record is created, with the copy of its user
   * - a student: its user copy is updated when it is older (see DbOpsUtils.updateManyReferences)
   * - a trace (its role was removed, or its account was deleted): it is a student again (an event) when its user has the
   *   role again and is not pending; a user invited again is pending until its first login: its trace is not changed
   *   until then, and nothing is notified
   * the students whose user copy changed are notified (the groups and the schedules keep their copies of them)
   * users: [ { id, status, ... } ] (as notified by the users service)
   * a failure is logged and the next users are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onUsersAddedOrModified: async (users, _ctx) => {
    const config = await Private.getConfig(_ctx);
    const [userRef] = config.references; // user (the references: user, classes[], groups[], schedules[])

    // the students that exist already
    const usersIDs = users.map((user) => user.id);
    const existingProjection = { _id: 0, id: 1, type: 1, user: 1 }; // the type: the target of the restore event
    const rStudents = await DbOpsUtils.getAllByIDs(config, usersIDs, existingProjection, _ctx);
    if (rStudents.error) {
      return rStudents;
    }
    const studentsMap = {};
    for (const student of rStudents.value) {
      studentsMap[student.id] = student;
    }

    const changedStudentsIDs = new Set();
    let failure = null; // the first failure (the next users are still done)
    for (const user of users) {
      const student = studentsMap[user.id];

      // a new student
      if (!student) {
        console.log(`\n${StudentsConstants.ServiceName}: create the student of the user ${user.id}`);
        const rPost = await Public.post({ id: user.id, classes: [] }, _ctx);
        if (rPost.error) {
          console.log(
            `\n${StudentsConstants.ServiceName}: failed to create the student of the user ${user.id}: ${rPost.error.message}`
          );
          failure ??= rPost;
        }
        continue;
      }

      // a trace of a user invited again: kept until its first login
      const isTrace = Private.isTrace(student.user);
      if (isTrace && user.status === UsersRest.Constants.Status.Pending) {
        console.log(`\n${StudentsConstants.ServiceName}: the trace ${user.id} is kept until the user logs in`);
        continue;
      }

      // its user copy (only an older one)
      const userCopy = CommonUtils.getProjectedObj(user, userRef.projection);
      const rCopy = await DbOpsUtils.updateManyReferences(config, userRef, userCopy, _ctx);
      if (rCopy.error) {
        console.log(
          `\n${StudentsConstants.ServiceName}: failed to update the copies of the user ${user.id}: ${rCopy.error.message}`
        );
        failure ??= rCopy;
        continue;
      }
      rCopy.ids.forEach((id) => changedStudentsIDs.add(id));

      // a trace that is a student again
      if (isTrace && rCopy.ids.includes(student.id)) {
        console.log(`\n${StudentsConstants.ServiceName}: the trace ${user.id} is a student again`);
        const eventObj = { ...student, name: user.name };
        const eventInfo = { status: user.status };
        await EventsRest.raiseEventForObject(
          StudentsConstants.ServiceName,
          Private.Action.Restore,
          eventObj,
          eventInfo,
          _ctx
        );
      }
    }

    // the changed students are notified, also after a failure
    const rNotify = await Private.notifyChangedStudents(config, [...changedStudentsIDs], _ctx);
    return failure || rNotify;
  },

  /**
   * the students of the users that are not students of the school anymore (the users notification, removed: the role was
   * removed, or the account was deleted: the notified user is deleted)
   * - a student that never logged in (its user copy is pending): deleted (an invitation that was not used leaves nothing)
   * - a trace: not changed
   * - otherwise by the setting of the school (removedMembers):
   *   keep: the student stays as a trace (its user copy is removed or deleted), with an event; it stays in the lists, the groups and the schedules
   *   delete: the student is deleted (the groups and the schedules remove it)
   * the students whose user copy changed are notified (the groups and the schedules keep their copies of them)
   * users: [ { id, status, ... } ] (as notified by the users service)
   * a failure is logged and the next users are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onUsersRemoved: async (users, _ctx) => {
    const config = await Private.getConfig(_ctx);

    // the setting of the school
    const rSettings = await SchoolsRest.getSettings(_ctx.tenantID, _ctx);
    if (rSettings.error) {
      return rSettings;
    }
    const keepTraces = rSettings.value.removedMembers === SchoolsRest.Constants.Settings.RemovedMembers.Keep;

    const changedStudentsIDs = new Set();
    let failure = null; // the first failure (the next users are still done)
    for (const user of users) {
      const rStudent = await DbOpsUtils.getOne(config, user.id, { _id: 0, id: 1, user: 1 }, _ctx);
      if (rStudent.status === 404) {
        continue;
      }
      if (rStudent.error) {
        console.log(
          `\n${StudentsConstants.ServiceName}: failed to read the student of the user ${user.id}: ${rStudent.error.message}`
        );
        failure ??= rStudent;
        continue;
      }

      // already a trace
      const studentUser = rStudent.value.user;
      if (Private.isTrace(studentUser)) {
        continue;
      }

      // deleted: an invitation that was not used, or by the setting of the school
      const neverJoined = studentUser?.status === UsersRest.Constants.Status.Pending;
      if (neverJoined || !keepTraces) {
        console.log(`\n${StudentsConstants.ServiceName}: delete the student ${user.id} (never joined: ${neverJoined})`);
        const rDelete = await Private.deleteStudent(config, user.id, _ctx);
        if (rDelete.error && rDelete.status !== 404) {
          console.log(
            `\n${StudentsConstants.ServiceName}: failed to delete the student ${user.id}: ${rDelete.error.message}`
          );
          failure ??= rDelete;
        }
        continue;
      }

      // a trace: deleted (the account was deleted) or removed (the role was removed)
      const accountDeleted = user.status === UsersRest.Constants.Status.Deleted;
      const traceStatus = accountDeleted ? UsersRest.Constants.Status.Deleted : UsersRest.Constants.Status.Removed;
      console.log(`\n${StudentsConstants.ServiceName}: keep the student ${user.id} as a trace, ${traceStatus}`);
      const rTrace = await Private.putTraceStatus(config, user.id, traceStatus, _ctx);
      if (rTrace.error) {
        console.log(
          `\n${StudentsConstants.ServiceName}: failed to keep the student ${user.id} as a trace: ${rTrace.error.message}`
        );
        failure ??= rTrace;
        continue;
      }
      changedStudentsIDs.add(user.id);
    }

    // the changed students are notified, also after a failure
    const rNotify = await Private.notifyChangedStudents(config, [...changedStudentsIDs], _ctx);
    return failure || rNotify;
  },

  /**
   * users notification, split by school (the schools where the user has, or had, the student role):
   * - added, modified: the students are saved (created when missing, otherwise their status and their user copy)
   * - removed (the student role was removed, or the account was deleted): the students are kept as traces or
   *   deleted, by the setting of the school
   * a failure is logged and the next schools are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onUsersNotification: async (notification, _ctx) => {
    const studentsNotification = UsersRest.filterNotificationByRole(notification, StudentsConstants.Type, _ctx);
    const schoolsNotifications = UsersRest.convertToTenantNotifications(studentsNotification, _ctx);
    let failure = null; // the first failure (the next schools are still done)

    for (const schoolNotification of schoolsNotifications) {
      const schoolCtx = { ..._ctx, tenantID: schoolNotification.tenantID };
      const usersNotification = schoolNotification.notification;

      // the users with the student role
      const addedUsers = usersNotification[Private.Notification.Added] || [];
      const modifiedUsers = usersNotification[Private.Notification.Modified] || [];
      const users = [...addedUsers, ...modifiedUsers];
      if (users.length) {
        const rSave = await Private.onUsersAddedOrModified(users, schoolCtx);
        if (rSave.error) {
          console.log(
            `\n${StudentsConstants.ServiceName}: failed to save the students of the school ${schoolNotification.tenantID}: ${rSave.error.message}`
          );
          failure ??= rSave;
        }
      }

      // the users without the student role (or without an account)
      const removedUsers = usersNotification[Private.Notification.Removed] || [];
      if (removedUsers.length) {
        const rRemove = await Private.onUsersRemoved(removedUsers, schoolCtx);
        if (rRemove.error) {
          console.log(
            `\n${StudentsConstants.ServiceName}: failed to remove the students of the school ${schoolNotification.tenantID}: ${rRemove.error.message}`
          );
          failure ??= rRemove;
        }
      }
    }

    return failure || { status: 200, value: true };
  },

  /**
   * classes notification: the copies of the classes in the students
   * - modified: the copies are updated (only the older ones, modifiedCount)
   * - removed (the class was deleted): the class is removed from the students
   * (a class is given to a student by the edit of the student, not by a notification)
   * a failure is logged and the next classes are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onClassesNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const [, classesRef] = config.references; // classes[] (the references: user, classes[], groups[], schedules[])
    let failure = null; // the first failure (the next classes are still done)

    // the copies of the modified classes
    for (const schoolClass of notification[Private.Notification.Modified] || []) {
      const classCopy = CommonUtils.getProjectedObj(schoolClass, classesRef.projection);
      const rCopies = await DbOpsUtils.updateManyReferences(config, classesRef, classCopy, _ctx);
      if (rCopies.error) {
        console.log(
          `\n${StudentsConstants.ServiceName}: failed to update the copies of the class ${schoolClass.id}: ${rCopies.error.message}`
        );
        failure ??= rCopies;
      }
    }

    // the deleted classes
    for (const schoolClass of notification[Private.Notification.Removed] || []) {
      console.log(`\n${StudentsConstants.ServiceName}: remove the deleted class ${schoolClass.id} from the students`);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, classesRef, { id: schoolClass.id }, _ctx);
      if (rRemove.error) {
        console.log(
          `\n${StudentsConstants.ServiceName}: failed to remove the class ${schoolClass.id}: ${rRemove.error.message}`
        );
        failure ??= rRemove;
      }
    }

    return failure || { status: 200, value: true };
  },

  /**
   * groups notification: a group is in the groups of its students (the students it lists)
   * - added, modified: the group is added to its students (the ones that do not have it yet), removed from the
   *   students that are not in it anymore (a student removed from it keeps its other groups), and its copies are
   *   updated (only the older ones, modifiedCount)
   * - removed (the group was deleted): the group is removed from all the students
   * a failure is logged and the next groups are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onGroupsNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const [, , groupsRef] = config.references; // groups[] (the references: user, classes[], groups[], schedules[])

    const addedGroups = notification[Private.Notification.Added] || [];
    const modifiedGroups = notification[Private.Notification.Modified] || [];
    let failure = null; // the first failure (the next groups are still done)
    for (const group of [...addedGroups, ...modifiedGroups]) {
      const groupCopy = CommonUtils.getProjectedObj(group, groupsRef.projection);

      // the students of the group (a notification without them changes only the copies)
      if (Array.isArray(group.students)) {
        const groupStudentsIDs = group.students.map((student) => student.id);

        // added to its students
        const rAdd = await DbOpsUtils.addManyReferences(config, groupStudentsIDs, groupsRef, groupCopy, _ctx);
        if (rAdd.error) {
          console.log(`\n${StudentsConstants.ServiceName}: failed to add the group ${group.id}: ${rAdd.error.message}`);
          failure ??= rAdd;
          continue;
        }

        // removed from the students that are not in it anymore
        const otherStudents = { filter: { id: { $nin: groupStudentsIDs } } };
        const rRemove = await DbOpsUtils.deleteManyReferences(config, groupsRef, { id: group.id }, _ctx, otherStudents);
        if (rRemove.error) {
          console.log(
            `\n${StudentsConstants.ServiceName}: failed to remove the group ${group.id}: ${rRemove.error.message}`
          );
          failure ??= rRemove;
          continue;
        }
      }

      // its copies
      const rCopies = await DbOpsUtils.updateManyReferences(config, groupsRef, groupCopy, _ctx);
      if (rCopies.error) {
        console.log(
          `\n${StudentsConstants.ServiceName}: failed to update the copies of the group ${group.id}: ${rCopies.error.message}`
        );
        failure ??= rCopies;
      }
    }

    // the deleted groups
    for (const group of notification[Private.Notification.Removed] || []) {
      console.log(`\n${StudentsConstants.ServiceName}: remove the deleted group ${group.id} from the students`);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, groupsRef, { id: group.id }, _ctx);
      if (rRemove.error) {
        console.log(
          `\n${StudentsConstants.ServiceName}: failed to remove the group ${group.id}: ${rRemove.error.message}`
        );
        failure ??= rRemove;
      }
    }

    return failure || { status: 200, value: true };
  },

  /**
   * schedules notification: a schedule is in the schedules of its students (the students it lists)
   * - added, modified: the schedule is added to its students (the ones that do not have it yet), removed from the
   *   students that are not in it anymore (a student removed from it keeps its other schedules), and its copies are
   *   updated (only the older ones, modifiedCount)
   * - removed (the schedule was deleted): the schedule is removed from all the students
   * a failure is logged and the next schedules are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onSchedulesNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const [, , , schedulesRef] = config.references; // schedules[] (the references: user, classes[], groups[], schedules[])

    const addedSchedules = notification[Private.Notification.Added] || [];
    const modifiedSchedules = notification[Private.Notification.Modified] || [];
    let failure = null; // the first failure (the next schedules are still done)
    for (const schedule of [...addedSchedules, ...modifiedSchedules]) {
      const scheduleCopy = CommonUtils.getProjectedObj(schedule, schedulesRef.projection);

      // the students of the schedule (a notification without them changes only the copies)
      if (Array.isArray(schedule.students)) {
        const scheduleStudentsIDs = schedule.students.map((student) => student.id);

        // added to its students
        const rAdd = await DbOpsUtils.addManyReferences(config, scheduleStudentsIDs, schedulesRef, scheduleCopy, _ctx);
        if (rAdd.error) {
          console.log(
            `\n${StudentsConstants.ServiceName}: failed to add the schedule ${schedule.id}: ${rAdd.error.message}`
          );
          failure ??= rAdd;
          continue;
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
          console.log(
            `\n${StudentsConstants.ServiceName}: failed to remove the schedule ${schedule.id}: ${rRemove.error.message}`
          );
          failure ??= rRemove;
          continue;
        }
      }

      // its copies
      const rCopies = await DbOpsUtils.updateManyReferences(config, schedulesRef, scheduleCopy, _ctx);
      if (rCopies.error) {
        console.log(
          `\n${StudentsConstants.ServiceName}: failed to update the copies of the schedule ${schedule.id}: ${rCopies.error.message}`
        );
        failure ??= rCopies;
      }
    }

    // the deleted schedules
    for (const schedule of notification[Private.Notification.Removed] || []) {
      console.log(`\n${StudentsConstants.ServiceName}: remove the deleted schedule ${schedule.id} from the students`);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, schedulesRef, { id: schedule.id }, _ctx);
      if (rRemove.error) {
        console.log(
          `\n${StudentsConstants.ServiceName}: failed to remove the schedule ${schedule.id}: ${rRemove.error.message}`
        );
        failure ??= rRemove;
      }
    }

    return failure || { status: 200, value: true };
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
    if (Private.isTrace(rget.value.user)) {
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
    const rRemove = await Private.onUsersRemoved([user], _ctx);
    if (rRemove.error) {
      return rRemove;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(rget, Private.ResProjection, _ctx);
  },

  /**
   * link the traces of a deleted account to the user invited again, by its email (called by the invite, before the
   * user gets its role, whatever the role): the students of the school with this email and another id take the id of
   * the user; their user copy stays deleted until the user has the role again and logs in (see onUsersAddedOrModified); the groups and the schedules follow the new id
   * (the modified notification has previousID)
   * objInfo: { email, userID }
   * a failure is logged and the next traces are still done; the first failure is returned at the end
   * returns { status, value: [ the previous ids ] } or { status, error }
   */
  relinkTraces: async (objInfo, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // validate
    const v = Validators.RelinkTraces.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // the traces of a deleted account with this email
    const config = await Private.getConfig(_ctx);
    const filter = {
      filter: {
        'user.email': objInfo.email,
        'user.status': UsersRest.Constants.Status.Deleted,
        id: { $ne: objInfo.userID },
      },
      projection: { _id: 0, id: 1 },
    };
    const rTraces = await DbOpsUtils.getAll(config, filter, _ctx);
    if (rTraces.error) {
      return rTraces;
    }

    const previousIDs = [];
    let failure = null; // the first failure (the next traces are still done)
    for (const trace of rTraces.value) {
      console.log(`\n${StudentsConstants.ServiceName}: link the trace ${trace.id} to the user ${objInfo.userID}`);
      const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
      const linked = { id: objInfo.userID, 'user.id': objInfo.userID };
      const r = await DbOpsUtils.put(config, trace.id, linked, projection, _ctx);
      if (r.error) {
        console.log(`\n${StudentsConstants.ServiceName}: failed to link the trace ${trace.id}: ${r.error.message}`);
        failure ??= r;
        continue;
      }

      // raise event for the link
      const eventObj = { ...r.value, name: r.value.user?.name };
      const eventInfo = { previousID: trace.id };
      await EventsRest.raiseEventForObject(
        StudentsConstants.ServiceName,
        Private.Action.Relink,
        eventObj,
        eventInfo,
        _ctx
      );

      // the groups and the schedules follow the new id (previousID), then the copy
      const rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
      await StudentsRest.raiseNotification(
        Private.Notification.Modified,
        [{ ...rnp.value, previousID: trace.id }],
        _ctx
      );

      previousIDs.push(trace.id);
    }

    return failure || { status: 200, value: previousIDs };
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
    const translations = {};
    return await TranslationsUtils.addTranslations(obj, translations, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: StudentsConstants,
};
