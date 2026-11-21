/**
 * Admins service
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
const UsersRest = require('../rest/users.rest.js');
const SchoolsRest = require('../rest/schools.rest.js');
const AdminsRest = require('../rest/admins.rest.js');
const AdminsConstants = require('./admins.constants.js');
const AdminsDatabase = require('./admins.database.js');

/**
 * validation
 */

const Schema = {
  Admin: Joi.object().keys({}),
};

const Validators = {
  Get: {
    filter: ['id', 'user.id', 'user.name', 'user.email', 'user.status', 'status'], // some have index
    sort: { 'user.name': 1 },
  },

  Post: Schema.Admin.fork([]).keys({
    id: Joi.string().min(1).max(64).required(),
    type: Joi.string().valid(AdminsConstants.Type),
  }),

  Put: Schema.Admin,

  Patch: Joi.object().keys({
    // for patch allowed operations are add, remove, set
    set: Schema.Admin,
    add: Joi.object().keys({}),
    remove: Joi.object().keys({}),
  }),
};

const Private = {
  Action: {
    ...BaseServiceUtils.Constants.Action,
    Restore: 'restore', // a trace is an admin again (the role was given again)
    Disable: 'disable', // the role was removed: the admin is kept as a trace, disabled
    AccountDeleted: 'accountDeleted', // the account was deleted: the admin is kept as a trace, deleted
  },
  Notification: NotificationsUtils.Constants.Notification,
  ResProjection: { ...BaseServiceUtils.Constants.DefaultProjection, user: 1, removedTimestamp: 1 },

  /**
   * config
   * returns { serviceName, collection, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: AdminsConstants.ServiceName,
      collection: await AdminsDatabase.collection(_ctx),
      references: [
        {
          fieldName: 'user',
          service: UsersRest,
          projection: { id: 1, name: 1, type: 1, status: 1, email: 1, createdTimestamp: 1, modifiedCount: 1 },
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
   * change the status of an admin: the status of its user while it has the role, or a trace (disabled: the role was
   * removed, deleted: the account was deleted; removedTimestamp: when); the translations of the status follow
   * statusInfo: { status, removedTimestamp }
   * event: the action of the event (null: no event, a change of the user has its own event in the users service)
   * returns { status, value } or { status, error }
   */
  putAdminStatus: async (config, adminID, statusInfo, event, _ctx) => {
    const changes = { ...statusInfo };
    await Public.translate(changes, _ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.put(config, adminID, changes, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for the status
    if (event) {
      const eventObj = { ...r.value, name: r.value.user?.name };
      await EventsRest.raiseEventForObject(AdminsConstants.ServiceName, event, eventObj, statusInfo, _ctx);
    }

    return r;
  },

  /**
   * delete an admin: its record is deleted, with an event and a removed notification (no other service keeps it)
   * returns { status, value } or { status, error } (404 when there is no record)
   */
  deleteAdmin: async (config, adminID, _ctx) => {
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.delete(config, adminID, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for delete
    const eventObj = { ...r.value, name: r.value.user?.name };
    await EventsRest.raiseEventForObject(AdminsConstants.ServiceName, Private.Action.Delete, eventObj, r.value, _ctx);

    // raise a notification for removed obj
    const rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    await AdminsRest.raiseNotification(Private.Notification.Removed, [rnp.value], _ctx);

    return r;
  },

  /**
   * save the admins of the users that have the admin role in the school (the users notification: added,
   * modified)
   * - a new admin: its record is created, with the status of its user
   * - an admin (also a trace of an earlier role that is an admin again: an event): its status follows its user,
   *   and its user copy is updated when it is older than the user (modifiedCount)
   * nothing is notified (no other service keeps copies of the admins)
   * users: [ { id, status, ... } ] (as notified by the users service)
   * returns { status, value } or { status, error }
   */
  saveAdminsOfUsers: async (users, _ctx) => {
    const config = await Private.getConfig(_ctx);
    const userRef = Private.getReference(config, 'user');

    // the admins that exist already
    const usersIDs = users.map((user) => user.id);
    const existingProjection = { _id: 0, id: 1, status: 1, removedTimestamp: 1 };
    const rAdmins = await DbOpsUtils.getAllByIDs(config, usersIDs, existingProjection, _ctx);
    if (rAdmins.error) {
      return rAdmins;
    }
    const adminsMap = {};
    for (const admin of rAdmins.value) {
      adminsMap[admin.id] = admin;
    }

    const changedAdminsIDs = new Set();
    for (const user of users) {
      const admin = adminsMap[user.id];

      // a new admin
      if (!admin) {
        console.log(`\n${AdminsConstants.ServiceName}: create the admin of the user ${user.id}`);
        const rPost = await Public.post({ id: user.id }, _ctx);
        if (rPost.error) {
          return rPost;
        }
        continue;
      }

      // its status follows its user (a trace that is an admin again: an event)
      if (admin.status !== user.status || admin.removedTimestamp) {
        const event = admin.removedTimestamp ? Private.Action.Restore : null;
        const statusInfo = { status: user.status, removedTimestamp: null };
        const rStatus = await Private.putAdminStatus(config, admin.id, statusInfo, event, _ctx);
        if (rStatus.error) {
          return rStatus;
        }
        changedAdminsIDs.add(admin.id);
      }

      // its user copy (only an older one)
      const userCopy = CommonUtils.getProjectedObj(user, userRef.projection);
      const rCopy = await DbOpsUtils.updateManyReferences(config, userRef, userCopy, _ctx);
      if (rCopy.error) {
        return rCopy;
      }
      rCopy.ids.forEach((id) => changedAdminsIDs.add(id));
    }

    return { status: 200, value: [...changedAdminsIDs] };
  },

  /**
   * the admins of the users that are not admins of the school anymore (the users notification, removed: the role
   * was removed, or the account was deleted)
   * - a user that never logged in (pending): its admin is deleted (an invitation that was not used leaves nothing)
   * - otherwise by the setting of the school (removedMembers):
   *   keep: the admin stays as a trace, disabled (the role was removed) or deleted (the account was deleted), with
   *   an event; it stays in the lists
   *   delete: the admin is deleted (no other service keeps it)
   * nothing is notified (no other service keeps copies of the admins)
   * users: [ { id, status, ... } ] (as notified by the users service)
   * returns { status, value } or { status, error }
   */
  removeAdminsOfUsers: async (users, _ctx) => {
    const config = await Private.getConfig(_ctx);
    const userRef = Private.getReference(config, 'user');

    // the setting of the school
    const rSettings = await SchoolsRest.getSettings(_ctx.tenantID, _ctx);
    if (rSettings.error) {
      return rSettings;
    }
    const keepTraces = rSettings.value.removedMembers === SchoolsRest.Constants.Settings.RemovedMembers.Keep;

    const changedAdminsIDs = new Set();
    for (const user of users) {
      // deleted: an invitation that was not used, or by the setting of the school
      const neverJoined = user.status === UsersRest.Constants.Status.Pending;
      if (neverJoined || !keepTraces) {
        console.log(`\n${AdminsConstants.ServiceName}: delete the admin ${user.id} (never joined: ${neverJoined})`);
        const rDelete = await Private.deleteAdmin(config, user.id, _ctx);
        if (rDelete.error && rDelete.status !== 404) {
          return rDelete;
        }
        continue;
      }

      // a trace: disabled (the role was removed) or deleted (the account was deleted)
      const traceProjection = { _id: 0, id: 1, status: 1, removedTimestamp: 1 };
      const rAdmin = await DbOpsUtils.getOne(config, user.id, traceProjection, _ctx);
      if (rAdmin.status === 404) {
        continue;
      }
      if (rAdmin.error) {
        return rAdmin;
      }

      const accountDeleted = user.status === UsersRest.Constants.Status.Deleted;
      const traceStatus = accountDeleted ? UsersRest.Constants.Status.Deleted : UsersRest.Constants.Status.Disabled;
      if (rAdmin.value.status !== traceStatus || !rAdmin.value.removedTimestamp) {
        console.log(`\n${AdminsConstants.ServiceName}: keep the admin ${user.id} as a trace, ${traceStatus}`);
        const removedTimestamp = rAdmin.value.removedTimestamp || new Date().toISOString();
        const statusInfo = { status: traceStatus, removedTimestamp };
        const event = accountDeleted ? Private.Action.AccountDeleted : Private.Action.Disable;
        const rStatus = await Private.putAdminStatus(config, user.id, statusInfo, event, _ctx);
        if (rStatus.error) {
          return rStatus;
        }
        changedAdminsIDs.add(user.id);
      }

      // its user copy (only an older one)
      const userCopy = CommonUtils.getProjectedObj(user, userRef.projection);
      const rCopy = await DbOpsUtils.updateManyReferences(config, userRef, userCopy, _ctx);
      if (rCopy.error) {
        return rCopy;
      }
      rCopy.ids.forEach((id) => changedAdminsIDs.add(id));
    }

    return { status: 200, value: [...changedAdminsIDs] };
  },

  /**
   * users notification, split by school (the schools where the user has, or had, the admin role):
   * - added, modified: the admins are saved (created when missing, otherwise their status and their user copy)
   * - removed (the admin role was removed, or the account was deleted): the admins are kept as traces or
   *   deleted, by the setting of the school
   * returns { status, value } or { status, error }
   */
  onUsersNotification: async (notification, _ctx) => {
    const adminsNotification = UsersRest.filterNotificationByRole(notification, AdminsConstants.Type, _ctx);
    const schoolsNotifications = UsersRest.convertToTenantNotifications(adminsNotification, _ctx);

    for (const schoolNotification of schoolsNotifications) {
      const schoolCtx = { ..._ctx, tenantID: schoolNotification.tenantID };
      const usersNotification = schoolNotification.notification;

      // the users with the admin role
      const addedUsers = usersNotification[Private.Notification.Added] || [];
      const modifiedUsers = usersNotification[Private.Notification.Modified] || [];
      const users = [...addedUsers, ...modifiedUsers];
      if (users.length) {
        const rSave = await Private.saveAdminsOfUsers(users, schoolCtx);
        if (rSave.error) {
          return rSave;
        }
      }

      // the users without the admin role (or without an account)
      const removedUsers = usersNotification[Private.Notification.Removed] || [];
      if (removedUsers.length) {
        const rRemove = await Private.removeAdminsOfUsers(removedUsers, schoolCtx);
        if (rRemove.error) {
          return rRemove;
        }
      }
    }

    return { status: 200, value: true };
  },

  /**
   * the admins of a school written by an earlier version have no status: they get the status of their user copy
   * (pending when it has none); nothing is notified: no other service keeps them
   * returns { status, value: [ completed ids ] } or { status, error }
   */
  fillMissingStatusOfSchool: async (_ctx) => {
    const config = await Private.getConfig(_ctx);
    const filter = { filter: { status: { $exists: false } }, projection: { _id: 0, id: 1, user: 1 } };
    const rAdmins = await DbOpsUtils.getAll(config, filter, _ctx);
    if (rAdmins.error) {
      return rAdmins;
    }

    const completedIDs = [];
    for (const admin of rAdmins.value) {
      const statusInfo = { status: admin.user?.status || UsersRest.Constants.Status.Pending };
      const rStatus = await Private.putAdminStatus(config, admin.id, statusInfo, null /* no event */, _ctx);
      if (rStatus.error) {
        return rStatus;
      }
      completedIDs.push(admin.id);
    }
    if (completedIDs.length) {
      console.log(
        `\n${AdminsConstants.ServiceName}: the status of ${completedIDs.length} admins of the school ${_ctx.tenantID} was completed`
      );
    }

    return { status: 200, value: completedIDs };
  },
};

const Public = {
  /**
   * init
   */
  init: async () => {},

  /**
   * complete the admins written by an earlier version (they have no status), in every school; called at the end of
   * the start (the schools and the notifications are ready); it finds none once they are completed
   * a school that fails is logged and the next ones are still completed (it is tried again at the next start)
   * returns { status, value: [ completed ids ] } or { status, error } (the schools can not be read)
   */
  fillMissingStatus: async () => {
    const _ctx = { reqID: 'AdminsFillMissingStatus', lang: 'en', tenantID: process.env.SMALL_API_PORTAL_SCHOOL_ID };
    const batch = AdminsConstants.FillMissingStatusBatch;

    const completedIDs = [];
    for (let skip = 0; ; skip += batch) {
      const rSchools = await SchoolsRest.getAll(`projection=id&skip=${skip}&limit=${batch}`, _ctx);
      if (rSchools.error) {
        console.log(`\n${AdminsConstants.ServiceName}: the schools can not be read: ${rSchools.error.message}`);
        return rSchools;
      }

      for (const school of rSchools.value) {
        const schoolCtx = { ..._ctx, tenantID: school.id };
        const r = await Private.fillMissingStatusOfSchool(schoolCtx);
        if (r.error) {
          console.log(
            `\n${AdminsConstants.ServiceName}: the status of the admins of the school ${school.id} can not be completed: ${r.error.message}`
          );
          continue;
        }
        completedIDs.push(...r.value);
      }

      if (rSchools.value.length < batch) {
        break;
      }
    }

    return { status: 200, value: completedIDs };
  },

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

    objInfo.type = AdminsConstants.Type;

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

    // the status of the admin is the status of its user (pending until the first login)
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
    await EventsRest.raiseEventForObject(AdminsConstants.ServiceName, Private.Action.Post, eventObj, r.value, _ctx);

    // raise a notification for new obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await AdminsRest.raiseNotification(Private.Notification.Added, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * delete: removes the admin role of the user in the current school (the one way to remove a member: the user and
   * its other roles are kept); the admin follows the removed role (the users notification): it stays as a trace or
   * it is deleted, by the setting of the school
   */
  delete: async (objID, _ctx) => {
    if (!_ctx.tenantID) {
      return Private.errorNoTenant(_ctx);
    }

    // the current admin can not remove itself (another admin, or a portal admin, removes it)
    if (objID === _ctx.userID) {
      console.log(`\nSkipping delete of current admin ${objID}`);
      const msg = 'You cannot remove yourself as admin';
      return { status: 400, error: { message: msg, error: new Error(msg) } };
    }

    // an admin of the school
    const config = await Private.getConfig(_ctx);
    const rget = await DbOpsUtils.getOne(config, objID, Private.ResProjection, _ctx);
    if (rget.error) {
      return rget;
    }

    // a trace (its role was already removed, or its account was deleted): it is deleted now, its references follow
    // (the removed notification)
    if (rget.value.removedTimestamp) {
      console.log(`\n${AdminsConstants.ServiceName}: delete the trace of the admin ${objID}`);
      const rDelete = await Private.deleteAdmin(config, objID, _ctx);
      if (rDelete.error) {
        return rDelete;
      }
      return BaseServiceUtils.getProjectedResponse(rget, Private.ResProjection, _ctx);
    }

    // remove the role
    const patchInfo = { remove: { schools: [{ id: _ctx.tenantID, roles: [AdminsConstants.Type] }] } };
    const rRole = await UsersRest.patchSchool(objID, patchInfo, _ctx);
    if (rRole.error) {
      return rRole;
    }

    // the admin follows the removed role (done by the users notification; an admin kept without its role by an
    // earlier version is done now)
    const user = { ...rget.value.user, id: objID };
    const rRemove = await Private.removeAdminsOfUsers([user], _ctx);
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
    await EventsRest.raiseEventForObject(AdminsConstants.ServiceName, Private.Action.Put, eventObj, objInfo, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await AdminsRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

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
    await EventsRest.raiseEventForObject(AdminsConstants.ServiceName, Private.Action.Patch, eventO, patchInfo, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await AdminsRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, Private.ResProjection, _ctx);
  },

  /**
   * notification: the copies kept by the admins follow the changes of their sources (each source has its own flow)
   * - users: the admins of the users with the admin role (created, status, user copy), kept as traces or deleted
   *   when the role is removed
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
      default:
        console.log(
          `\n${AdminsConstants.ServiceName}: notification of ${notification.serviceName} ignored (no copy of it)`
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
  Constants: AdminsConstants,
};
