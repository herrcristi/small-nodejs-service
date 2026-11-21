/**
 * Groups service
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
const StudentsRest = require('../rest/students.rest.js');
const SchedulesRest = require('../rest/schedules.rest.js');
const GroupsRest = require('../rest/groups.rest.js');
const GroupsConstants = require('./groups.constants.js');
const GroupsDatabase = require('./groups.database.js');

/**
 * validation
 */
const SchemaStudents = Joi.array().items(
  Joi.object().keys({
    id: Joi.string().min(1).max(64).required(),
  })
);

const Schema = {
  Group: Joi.object().keys({
    name: Joi.string().min(1).max(64),
    status: Joi.string()
      .min(1)
      .max(64)
      .valid(...Object.values(GroupsConstants.Status)),
    description: Joi.string().min(1).max(1024).allow(null),
    students: SchemaStudents,
  }),
};

const Validators = {
  Get: {
    filter: [
      'id',
      'name',
      'status',
      'description',
      'students.id',
      'students.user.name',
      'schedules.id',
      'schedules.name',
    ], // some have index
    sort: { name: 1 },
  },

  Post: Schema.Group.fork(['name', 'students'], (x) => x.required() /*make required */).keys({
    type: Joi.string().valid(GroupsConstants.Type),
  }),

  Put: Schema.Group,

  Patch: Joi.object().keys({
    // for patch allowed operations are set, unset, add, remove
    set: Schema.Group,
    unset: Joi.array().items(Joi.string().min(1).max(128).valid('description')),
    add: Joi.object().keys({
      students: SchemaStudents,
    }),
    remove: Joi.object().keys({
      students: SchemaStudents,
    }),
  }),
};

const Private = {
  Action: BaseServiceUtils.Constants.Action,
  Notification: NotificationsUtils.Constants.Notification,
  ResProjection: { ...BaseServiceUtils.Constants.DefaultProjection },

  /**
   * config
   * returns { serviceName, collection, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: GroupsConstants.ServiceName,
      collection: await GroupsDatabase.collection(_ctx),
      references: [
        {
          fieldName: 'students[]',
          service: StudentsRest,
          projection: { id: 1, name: 1, type: 1, status: 1, user: 1, createdTimestamp: 1, modifiedCount: 1 },
        },
        {
          fieldName: 'schedules[]',
          service: SchedulesRest,
          projection: { id: 1, name: 1, type: 1, status: 1, class: 1, createdTimestamp: 1, modifiedCount: 1 },
        },
      ],
      notifications: {
        projection: { ...BaseServiceUtils.Constants.DefaultProjection, students: 1 },
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
   * notify the groups that changed (modified): the schedules keep the students of their groups
   * returns { status, value: [ ids ] } or { status, error }
   */
  notifyChangedGroups: async (config, groupsIDs, _ctx) => {
    if (!groupsIDs.length) {
      return { status: 200, value: [] };
    }

    const projection = { ...config.notifications.projection, _id: 0 };
    const rGroups = await DbOpsUtils.getAllByIDs(config, groupsIDs, projection, _ctx);
    if (rGroups.error) {
      return rGroups;
    }

    console.log(`\n${GroupsConstants.ServiceName}: notify the changed groups ${JSON.stringify(groupsIDs)}`);
    await GroupsRest.raiseNotification(Private.Notification.Modified, rGroups.value, _ctx);
    return { status: 200, value: groupsIDs };
  },

  /**
   * students notification: the copies of the students in the groups (students[])
   * - modified: the copies are updated (only the older ones, modifiedCount)
   * - removed (the student was deleted): it is removed from the groups (and these groups are notified)
   * (a student is put in a group by the edit of the group, not by a notification)
   * the groups whose copies changed are notified (the schedules keep the students of their groups)
   * a failure is logged and the next students are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onStudentsNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const [studentsRef] = config.references; // students[] (the references: students[], schedules[])
    const changedGroupsIDs = new Set();
    let failure = null; // the first failure (the next students are still done)

    // the copies of the modified students
    for (const student of notification[Private.Notification.Modified] || []) {
      // a trace linked to the user invited again: its copies take its new id first
      if (student.previousID) {
        const rID = await DbOpsUtils.updateManyReferencesID(config, studentsRef, student.previousID, student.id, _ctx);
        if (rID.error) {
          console.log(
            `\n${GroupsConstants.ServiceName}: failed to link the copies of the student ${student.id}: ${rID.error.message}`
          );
          failure ??= rID;
          continue;
        }
        rID.ids.forEach((id) => changedGroupsIDs.add(id));
      }

      const studentCopy = CommonUtils.getProjectedObj(student, studentsRef.projection);
      const rCopies = await DbOpsUtils.updateManyReferences(config, studentsRef, studentCopy, _ctx);
      if (rCopies.error) {
        console.log(
          `\n${GroupsConstants.ServiceName}: failed to update the copies of the student ${student.id}: ${rCopies.error.message}`
        );
        failure ??= rCopies;
        continue;
      }
      rCopies.ids.forEach((id) => changedGroupsIDs.add(id));
    }

    // the deleted students
    for (const student of notification[Private.Notification.Removed] || []) {
      console.log(`\n${GroupsConstants.ServiceName}: remove the deleted student ${student.id} from the groups`);
      // the groups that have it (they are notified)
      const rGroups = await DbOpsUtils.getAllByReference(config, studentsRef, student.id, { _id: 0, id: 1 }, _ctx);
      if (rGroups.error) {
        console.log(
          `\n${GroupsConstants.ServiceName}: failed to remove the student ${student.id}: ${rGroups.error.message}`
        );
        failure ??= rGroups;
        continue;
      }
      rGroups.value.forEach((item) => changedGroupsIDs.add(item.id));

      const studentCopy = CommonUtils.getProjectedObj(student, studentsRef.projection);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, studentsRef, studentCopy, _ctx);
      if (rRemove.error) {
        console.log(
          `\n${GroupsConstants.ServiceName}: failed to remove the student ${student.id}: ${rRemove.error.message}`
        );
        failure ??= rRemove;
      }
    }

    // the changed groups are notified, also after a failure
    const rNotify = await Private.notifyChangedGroups(config, [...changedGroupsIDs], _ctx);
    return failure || rNotify;
  },

  /**
   * schedules notification: a schedule is in the schedules of its groups (the groups it lists)
   * - added, modified: the schedule is added to its groups (the ones that do not have it yet), removed from the
   *   groups that are not in it anymore (a group removed from it keeps its other schedules), and its copies are
   *   updated (only the older ones, modifiedCount)
   * - removed (the schedule was deleted): the schedule is removed from all the groups
   * a failure is logged and the next schedules are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onSchedulesNotification: async (notification, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    const config = await Private.getConfig(_ctx);
    const [, schedulesRef] = config.references; // schedules[] (the references: students[], schedules[])

    const addedSchedules = notification[Private.Notification.Added] || [];
    const modifiedSchedules = notification[Private.Notification.Modified] || [];
    let failure = null; // the first failure (the next schedules are still done)
    for (const schedule of [...addedSchedules, ...modifiedSchedules]) {
      const scheduleCopy = CommonUtils.getProjectedObj(schedule, schedulesRef.projection);

      // the groups of the schedule (a notification without them changes only the copies)
      if (Array.isArray(schedule.groups)) {
        const scheduleGroupsIDs = schedule.groups.map((group) => group.id);

        // added to its groups
        const rAdd = await DbOpsUtils.addManyReferences(config, scheduleGroupsIDs, schedulesRef, scheduleCopy, _ctx);
        if (rAdd.error) {
          console.log(
            `\n${GroupsConstants.ServiceName}: failed to add the schedule ${schedule.id}: ${rAdd.error.message}`
          );
          failure ??= rAdd;
          continue;
        }

        // removed from the groups that are not in it anymore
        const otherGroups = { filter: { id: { $nin: scheduleGroupsIDs } } };
        const rRemove = await DbOpsUtils.deleteManyReferences(
          config,
          schedulesRef,
          { id: schedule.id },
          _ctx,
          otherGroups
        );
        if (rRemove.error) {
          console.log(
            `\n${GroupsConstants.ServiceName}: failed to remove the schedule ${schedule.id}: ${rRemove.error.message}`
          );
          failure ??= rRemove;
          continue;
        }
      }

      // its copies
      const rCopies = await DbOpsUtils.updateManyReferences(config, schedulesRef, scheduleCopy, _ctx);
      if (rCopies.error) {
        console.log(
          `\n${GroupsConstants.ServiceName}: failed to update the copies of the schedule ${schedule.id}: ${rCopies.error.message}`
        );
        failure ??= rCopies;
      }
    }

    // the deleted schedules
    for (const schedule of notification[Private.Notification.Removed] || []) {
      console.log(`\n${GroupsConstants.ServiceName}: remove the deleted schedule ${schedule.id} from the groups`);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, schedulesRef, { id: schedule.id }, _ctx);
      if (rRemove.error) {
        console.log(
          `\n${GroupsConstants.ServiceName}: failed to remove the schedule ${schedule.id}: ${rRemove.error.message}`
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

    objInfo.type = GroupsConstants.Type;
    objInfo.status = objInfo.status || GroupsConstants.Status.Pending; // add default status if not set

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

    // post
    const r = await DbOpsUtils.post(config, objInfo, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for post
    await EventsRest.raiseEventForObject(GroupsConstants.ServiceName, Private.Action.Post, r.value, r.value, _ctx);

    // raise a notification for new obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await GroupsRest.raiseNotification(Private.Notification.Added, [rnp.value], _ctx);

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
    await EventsRest.raiseEventForObject(GroupsConstants.ServiceName, Private.Action.Delete, r.value, r.value, _ctx);

    // raise a notification for removed obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await GroupsRest.raiseNotification(Private.Notification.Removed, [rnp.value], _ctx);

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

    // put
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for put
    await EventsRest.raiseEventForObject(GroupsConstants.ServiceName, Private.Action.Put, r.value, objInfo, _ctx);

    // raise a notification for modified obj: it has the students of the group, so a removed student loses only this
    // group (the students service removes it from the students that are not listed)
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await GroupsRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

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

    // patch
    const r = await DbOpsUtils.patch(config, objID, patchInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for patch
    await EventsRest.raiseEventForObject(GroupsConstants.ServiceName, Private.Action.Patch, r.value, patchInfo, _ctx);

    // raise a notification for modified obj: it has the students of the group, so a removed student loses only this
    // group (the students service removes it from the students that are not listed)
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await GroupsRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * notification: the copies kept by the groups follow the changes of their sources (each source has its own flow)
   * - students: the copies of the students in the groups (the groups whose copies changed are notified)
   * - schedules: a schedule is in the schedules of its groups
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
      case StudentsRest.Constants.ServiceName:
        return await Private.onStudentsNotification(notification, _ctx);
      case SchedulesRest.Constants.ServiceName:
        return await Private.onSchedulesNotification(notification, _ctx);
      default:
        console.log(
          `\n${GroupsConstants.ServiceName}: notification of ${notification.serviceName} ignored (no copy of it)`
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
  Constants: GroupsConstants,
};
