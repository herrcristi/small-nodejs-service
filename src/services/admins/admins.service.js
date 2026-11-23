/**
 * Admins service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const TranslationsUtils = require('../../core/utils/translations.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const ValidationUtils = require('../../core/utils/validation.utils.js');
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
    filter: ['id', 'user.id', 'user.name', 'user.email', 'user.status'], // some have index
    sort: { 'user.name': 1 },
  },

  Post: Schema.Admin.fork([]).keys({
    id: Joi.string().min(1).max(64).required(),
    type: Joi.string().valid(AdminsConstants.Type),
  }),

  RelinkTraces: Joi.object().keys({
    email: ValidationUtils.email().required(),
    userID: Joi.string().min(1).max(64).required(),
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
    Relink: 'relink', // a trace of a deleted account is linked to the user invited again (its new id)
    Restore: 'restore', // a trace is an admin again (the role was given again)
    Remove: 'remove', // the role was removed: the admin is kept as a trace (its user is removed)
    AccountDeleted: 'accountDeleted', // the account was deleted: the admin is kept as a trace (its user is deleted)
  },
  Notification: NotificationsUtils.Constants.Notification,
  ResProjection: { ...BaseServiceUtils.Constants.DefaultProjection, user: 1 },

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
   * a trace: the copy of a user that does not have the role anymore (deleted: the account was deleted, removed: the
   * role was removed); it stays in the lists
   */
  isTrace: (user) => {
    return [UsersRest.Constants.Status.Deleted, UsersRest.Constants.Status.Removed].includes(user?.status);
  },

  /**
   * keep an admin as a trace: the status of its user copy is deleted or removed (the other fields of the copy are kept),
   * with an event
   * returns { status, value } or { status, error }
   */
  putTraceStatus: async (config, adminID, status, _ctx) => {
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.put(config, adminID, { 'user.status': status }, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for the trace
    const event = status === UsersRest.Constants.Status.Deleted ? Private.Action.AccountDeleted : Private.Action.Remove;
    const eventObj = { ...r.value, name: r.value.user?.name };
    await EventsRest.raiseEventForObject(AdminsConstants.ServiceName, event, eventObj, { status }, _ctx);

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
   * save the admins of the users that have the admin role in the school (the users notification: added, modified)
   * - a new admin: its record is created, with the copy of its user
   * - an admin: its user copy is updated when it is older (see DbOpsUtils.updateManyReferences)
   * - a trace (its role was removed, or its account was deleted): it is an admin again (an event) when its user has the
   *   role again and is not pending; a user invited again is pending until its first login: its trace is not changed
   *   until then, and nothing is notified
   * nothing is notified (no other service keeps copies of the admins)
   * users: [ { id, status, ... } ] (as notified by the users service)
   * a failure is logged and the next users are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onUsersAddedOrModified: async (users, _ctx) => {
    const config = await Private.getConfig(_ctx);
    const [userRef] = config.references; // the copy of the user (user): the only reference of the admins

    // the admins that exist already
    const usersIDs = users.map((user) => user.id);
    const existingProjection = { _id: 0, id: 1, type: 1, user: 1 }; // the type: the target of the restore event
    // the notification is handled in the request that wrote (a trace relinked by the invite): read the primary
    const rAdmins = await DbOpsUtils.getAllByIDs(
      config,
      usersIDs,
      existingProjection,
      _ctx,
      DbOpsUtils.Constants.ReadPrimary
    );
    if (rAdmins.error) {
      return rAdmins;
    }
    const adminsMap = {};
    for (const admin of rAdmins.value) {
      adminsMap[admin.id] = admin;
    }

    const changedAdminsIDs = new Set();
    let failure = null; // the first failure (the next users are still done)
    for (const user of users) {
      const admin = adminsMap[user.id];

      // a new admin
      if (!admin) {
        console.log(`\n${AdminsConstants.ServiceName}: create the admin of the user ${user.id}`);
        const rPost = await Public.post({ id: user.id }, _ctx);
        if (rPost.error) {
          console.log(
            `\n${AdminsConstants.ServiceName}: failed to create the admin of the user ${user.id}: ${rPost.error.message}`
          );
          failure ??= rPost;
        }
        continue;
      }

      // a trace of a user invited again: kept until its first login
      const isTrace = Private.isTrace(admin.user);
      if (isTrace && user.status === UsersRest.Constants.Status.Pending) {
        console.log(`\n${AdminsConstants.ServiceName}: the trace ${user.id} is kept until the user logs in`);
        continue;
      }

      // its user copy (only an older one)
      const userCopy = CommonUtils.getProjectedObj(user, userRef.projection);
      const rCopy = await DbOpsUtils.updateManyReferences(config, userRef, userCopy, _ctx);
      if (rCopy.error) {
        console.log(
          `\n${AdminsConstants.ServiceName}: failed to update the copies of the user ${user.id}: ${rCopy.error.message}`
        );
        failure ??= rCopy;
        continue;
      }
      rCopy.ids.forEach((id) => changedAdminsIDs.add(id));

      // a trace that is an admin again
      if (isTrace && rCopy.ids.includes(admin.id)) {
        console.log(`\n${AdminsConstants.ServiceName}: the trace ${user.id} is an admin again`);
        const eventObj = { ...admin, name: user.name };
        const eventInfo = { status: user.status };
        await EventsRest.raiseEventForObject(
          AdminsConstants.ServiceName,
          Private.Action.Restore,
          eventObj,
          eventInfo,
          _ctx
        );
      }
    }

    return failure || { status: 200, value: [...changedAdminsIDs] };
  },

  /**
   * the admins of the users that are not admins of the school anymore (the users notification, removed: the role was
   * removed, or the account was deleted: the notified user is deleted)
   * - an admin that never logged in (its user copy is pending): deleted (an invitation that was not used leaves nothing)
   * - a trace: not changed
   * - otherwise by the setting of the school (removedMembers):
   *   keep: the admin stays as a trace (its user copy is removed or deleted), with an event; it stays in the lists
   *   delete: the admin is deleted (no other service keeps it)
   * nothing is notified (no other service keeps copies of the admins)
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

    const changedAdminsIDs = new Set();
    let failure = null; // the first failure (the next users are still done)
    for (const user of users) {
      // the notification is handled in the request that wrote (a record created just before): read the primary
      const rAdmin = await DbOpsUtils.getOne(
        config,
        user.id,
        { _id: 0, id: 1, user: 1 },
        _ctx,
        DbOpsUtils.Constants.ReadPrimary
      );
      if (rAdmin.status === 404) {
        continue;
      }
      if (rAdmin.error) {
        console.log(
          `\n${AdminsConstants.ServiceName}: failed to read the admin of the user ${user.id}: ${rAdmin.error.message}`
        );
        failure ??= rAdmin;
        continue;
      }

      // already a trace
      const adminUser = rAdmin.value.user;
      if (Private.isTrace(adminUser)) {
        continue;
      }

      // deleted: an invitation that was not used, or by the setting of the school
      const neverJoined = adminUser?.status === UsersRest.Constants.Status.Pending;
      if (neverJoined || !keepTraces) {
        console.log(`\n${AdminsConstants.ServiceName}: delete the admin ${user.id} (never joined: ${neverJoined})`);
        const rDelete = await Private.deleteAdmin(config, user.id, _ctx);
        if (rDelete.error && rDelete.status !== 404) {
          console.log(
            `\n${AdminsConstants.ServiceName}: failed to delete the admin ${user.id}: ${rDelete.error.message}`
          );
          failure ??= rDelete;
        }
        continue;
      }

      // a trace: deleted (the account was deleted) or removed (the role was removed)
      const accountDeleted = user.status === UsersRest.Constants.Status.Deleted;
      const traceStatus = accountDeleted ? UsersRest.Constants.Status.Deleted : UsersRest.Constants.Status.Removed;
      console.log(`\n${AdminsConstants.ServiceName}: keep the admin ${user.id} as a trace, ${traceStatus}`);
      const rTrace = await Private.putTraceStatus(config, user.id, traceStatus, _ctx);
      if (rTrace.error) {
        console.log(
          `\n${AdminsConstants.ServiceName}: failed to keep the admin ${user.id} as a trace: ${rTrace.error.message}`
        );
        failure ??= rTrace;
        continue;
      }
      changedAdminsIDs.add(user.id);
    }

    return failure || { status: 200, value: [...changedAdminsIDs] };
  },

  /**
   * users notification, split by school (the schools where the user has, or had, the admin role):
   * - added, modified: the admins are saved (created when missing, otherwise their status and their user copy)
   * - removed (the admin role was removed, or the account was deleted): the admins are kept as traces or
   *   deleted, by the setting of the school
   * a failure is logged and the next schools are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onUsersNotification: async (notification, _ctx) => {
    const adminsNotification = UsersRest.filterNotificationByRole(notification, AdminsConstants.Type, _ctx);
    const schoolsNotifications = UsersRest.convertToTenantNotifications(adminsNotification, _ctx);
    let failure = null; // the first failure (the next schools are still done)

    for (const schoolNotification of schoolsNotifications) {
      const schoolCtx = { ..._ctx, tenantID: schoolNotification.tenantID };
      const usersNotification = schoolNotification.notification;

      // the users with the admin role
      const addedUsers = usersNotification[Private.Notification.Added] || [];
      const modifiedUsers = usersNotification[Private.Notification.Modified] || [];
      const users = [...addedUsers, ...modifiedUsers];
      if (users.length) {
        const rSave = await Private.onUsersAddedOrModified(users, schoolCtx);
        if (rSave.error) {
          console.log(
            `\n${AdminsConstants.ServiceName}: failed to save the admins of the school ${schoolNotification.tenantID}: ${rSave.error.message}`
          );
          failure ??= rSave;
        }
      }

      // the users without the admin role (or without an account)
      const removedUsers = usersNotification[Private.Notification.Removed] || [];
      if (removedUsers.length) {
        const rRemove = await Private.onUsersRemoved(removedUsers, schoolCtx);
        if (rRemove.error) {
          console.log(
            `\n${AdminsConstants.ServiceName}: failed to remove the admins of the school ${schoolNotification.tenantID}: ${rRemove.error.message}`
          );
          failure ??= rRemove;
        }
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
    if (Private.isTrace(rget.value.user)) {
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
    const rRemove = await Private.onUsersRemoved([user], _ctx);
    if (rRemove.error) {
      return rRemove;
    }

    // success
    return BaseServiceUtils.getProjectedResponse(rget, Private.ResProjection, _ctx);
  },

  /**
   * link the traces of a deleted account to the user invited again, by its email (called by the invite, before the
   * user gets its role, whatever the role): the admins of the school with this email and another id take the id of
   * the user; their user copy stays deleted until the user has the role again and logs in (see onUsersAddedOrModified)
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
      console.log(`\n${AdminsConstants.ServiceName}: link the trace ${trace.id} to the user ${objInfo.userID}`);
      const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
      const linked = { id: objInfo.userID, 'user.id': objInfo.userID };
      const r = await DbOpsUtils.put(config, trace.id, linked, projection, _ctx);
      if (r.error) {
        console.log(`\n${AdminsConstants.ServiceName}: failed to link the trace ${trace.id}: ${r.error.message}`);
        failure ??= r;
        continue;
      }

      // raise event for the link
      const eventObj = { ...r.value, name: r.value.user?.name };
      const eventInfo = { previousID: trace.id };
      await EventsRest.raiseEventForObject(
        AdminsConstants.ServiceName,
        Private.Action.Relink,
        eventObj,
        eventInfo,
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
    const translations = {};
    return await TranslationsUtils.addTranslations(obj, translations, _ctx);
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: AdminsConstants,
};
