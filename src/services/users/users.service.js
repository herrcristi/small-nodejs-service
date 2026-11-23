/**
 * Users service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DatabaseManagerUtils = require('../../core/utils/database-manager.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils');
const TranslationsUtils = require('../../core/utils/translations.utils.js');
const CommonUtils = require('../../core/utils/common.utils');
const ConfigSettings = require('../config.settings.js');
const ValidationUtils = require('../../core/utils/validation.utils.js');
const ReferencesUtils = require('../../core/utils/base-service.references.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const UsersRest = require('../rest/users.rest.js');
const SchoolsRest = require('../rest/schools.rest.js');
const EventsRest = require('../rest/events.rest.js');
const UsersConstants = require('./users.constants.js');
const UsersDatabase = require('./users.database.js');

/**
 * validation
 */
const SchemaSchools = Joi.array().items(
  Joi.object().keys({
    id: Joi.string().min(1).max(64).required(),
    roles: Joi.array()
      .items(
        Joi.string()
          .min(1)
          .max(32)
          .required()
          .valid(...Object.values(UsersConstants.Roles))
      )
      .min(1)
      .required(),
  })
);

const Schema = {
  // the profile fields that the user (and the admins of the school) can change
  UserProfile: Joi.object().keys({
    name: Joi.string().trim().min(1).max(128), // without the spaces around it (only spaces: refused)
    birthday: Joi.string().isoDate(), // kept as an iso string (a date would be converted to a Date object)
    phoneNumber: Joi.string()
      .min(1)
      .max(32)
      .regex(/^(\d|\+|\-|\.|' ')*$/), // allow 0-9 + - . in any order
    address: Joi.string().min(1).max(256),
  }),

  // what a portal admin can change of another user (the other profile fields are personal, the email is the login)
  UserName: Joi.object().keys({
    name: Joi.string().trim().min(1).max(128), // without the spaces around it (only spaces: refused)
  }),

  // pending is only the initial state (set on create): a status never goes back to pending
  UserStatus: Joi.object().keys({
    status: Joi.string().min(1).max(64).valid(UsersConstants.Status.Active, UsersConstants.Status.Disabled).required(),
  }),

  UserEmail: Joi.object().keys({
    email: ValidationUtils.email(),
  }),
};

const Validators = {
  Get: {
    filter: ['id', 'email', 'status', 'name', 'phoneNumber', 'address', 'schools.id', 'schools.name'], // some have index
    sort: { name: 1 },
  },

  // the lists of a portal admin: no filter on the schools of the users
  GetPortal: {
    filter: ['id', 'email', 'status', 'name'],
    sort: { name: 1 },
  },

  Post: Schema.UserEmail.keys({
    id: Joi.string().min(1).max(64), // (internal) a new id given by the invite (the traces are linked to it first)
    name: Joi.string().trim().min(1).max(128), // without the spaces around it (only spaces: refused)
    type: Joi.string().valid(UsersConstants.Type),
    schools: SchemaSchools,
  }).fork(['email', 'schools'], (x) => x.required() /*make required */),

  // profile fields only: the status is global (all the schools of the user) and has its own route (portal admin)
  Put: Schema.UserProfile.min(1), // a change has at least one field
  PutPortal: Schema.UserName.min(1),
  PutStatus: Schema.UserStatus,
  PutEmail: Schema.UserEmail.fork(['email'], (x) => x.required() /*make required */),

  Patch: Joi.object()
    .keys({
      // for patch allowed operations are set, unset
      set: Schema.UserProfile,
      unset: Joi.array().items(Joi.string().min(1).max(128).valid('phoneNumber')),
    })
    .min(1), // a change has at least one operation
  PatchPortal: Joi.object()
    .keys({
      set: Schema.UserName,
    })
    .min(1),
  PatchStatus: Joi.object().keys({
    set: Schema.UserStatus.required(),
  }),

  PatchSchool: Joi.object().keys({
    // for patch school allowed operations are add, remove
    add: Joi.object().keys({
      schools: SchemaSchools,
    }),
    remove: Joi.object().keys({
      schools: SchemaSchools,
    }),
  }),

  // the internal changes of the status (never from a request)
  Activate: Joi.object().keys({
    status: Joi.string().valid(UsersConstants.Status.Active).required(),
  }),
};

const Private = {
  Action: {
    ...BaseServiceUtils.Constants.Action,
    PutEmail: 'putEmail',
    PutStatus: 'putStatus',
    PatchStatus: 'patchStatus',
    PatchSchool: 'patchSchool',
    Activate: 'activate',
  },

  /**
   * the timer of the cleanup of the pending users (see Public.deleteExpiredPending), and the most users removed at once
   */
  PendingCleanupTimer: null,
  PendingCleanupBatch: 100,

  /**
   * start the regular cleanup of the users whose invitation was not used in time (every pod runs it: a user removed
   * by another pod is not found, which is fine); the timer does not keep the process alive
   */
  startPendingCleanup: () => {
    // an init again (the tests) starts it again
    clearInterval(Private.PendingCleanupTimer);

    // every hour, or as often as the expiry when it is shorter (SMALL_API_PENDING_EXPIRES_IN): a pending record is
    // removed at most one interval after it expired
    const expiresIn = ConfigSettings.getPendingExpiresIn();
    const interval = Math.min(UsersConstants.PendingCleanupInterval, expiresIn) * 1000;
    console.log(
      `\n${UsersConstants.ServiceName}: the pending users expire ${expiresIn} s after they were created, checked every ${interval / 1000} s`
    );
    Private.PendingCleanupTimer = setInterval(async () => {
      // the events of the cleanup are written in the log of the portal school
      const cleanupUser = EventsRest.Constants.NoLoginUsers.PendingCleanup;
      const _ctx = {
        reqID: 'UsersPendingCleanup',
        lang: 'en',
        tenantID: process.env.SMALL_API_PORTAL_SCHOOL_ID,
        userID: cleanupUser,
        username: cleanupUser,
      };
      try {
        const r = await Public.deleteExpiredPending(_ctx);
        if (r.error) {
          console.log(`\n${UsersConstants.ServiceName}: the cleanup of the pending users failed: ${r.error.message}`);
        }
      } catch (e) {
        console.log(
          `\n${UsersConstants.ServiceName}: the cleanup of the pending users failed: ${CommonUtils.getLogError(e)}`
        );
      }
    }, interval);
    Private.PendingCleanupTimer.unref();
  },

  /**
   * the user as it is now (a conditional change that did not apply: the status was changed meanwhile)
   * returns { status, value } with the default projection, or { status, error }
   */
  getCurrentStatus: async (objID, _ctx) => {
    const config = await Private.getConfig(_ctx);
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    // after a conditional write that changed nothing (no object in its answer): read on the primary
    const rget = await DbOpsUtils.getOne(config, objID, projection, _ctx, {
      readPreference: DbOpsUtils.Constants.ReadPrimary,
    });
    return BaseServiceUtils.getProjectedResponse(rget, null /*default projection */, _ctx);
  },

  Notification: NotificationsUtils.Constants.Notification,

  /**
   * who the caller is for the user that a request targets (/users/:id)
   */
  Access: {
    Self: 'self', // the user itself: all its data
    Portal: 'portal', // a portal admin (on the portal school): any user, without its schools, only the name is changed
    Member: 'member', // an admin of the current school: a member of the school, only the current school is shown
  },

  /**
   * what a portal admin sees of a user (not its schools and not its personal profile fields)
   */
  PortalProjection: {
    _id: 0,
    id: 1,
    name: 1,
    email: 1,
    type: 1,
    status: 1,
    createdTimestamp: 1,
    lastModifiedTimestamp: 1,
    modifiedCount: 1,
    _lang_en: 1,
  },

  /**
   * the portal school is the tenant of the request (only portal admins can select it)
   */
  isPortalTenant: (_ctx) => {
    const portalSchoolID = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    return !!portalSchoolID && _ctx.tenantID === portalSchoolID;
  },

  /**
   * error for the routes of the portal admins called on another school
   */
  portalRequired: () => {
    const msg = 'Portal school access required';
    return { status: 403, error: { message: msg, error: new Error(msg) } };
  },

  /**
   * get all for a request with a schema of the allowed filters and an optional restriction set by the caller
   * req: { query }
   * restrictFilter: (filter) => {} the restriction of the caller, optional
   * options: the options of the read (an internal request: the ones asked by the calling service), optional
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllForReq: async (req, schema, _ctx, restrictFilter, options) => {
    // convert query to mongo build filter: { filter, projection, limit, skip, sort }
    const rf = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    if (rf.error) {
      return rf;
    }
    const filter = rf.value;

    // optional restriction applied by the caller (like the portal admins list)
    restrictFilter?.(filter);

    // get all (and expanded too)
    let r = await Public.getAll(filter, _ctx, options);
    if (r.error) {
      return r;
    }

    // get corresponding count
    let rCount = await Public.getAllCount(filter, _ctx, options);
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
   * config
   * returns { serviceName, collection, maxTimeMS, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: UsersConstants.ServiceName,
      collection: await UsersDatabase.collection(_ctx),
      maxTimeMS: DatabaseManagerUtils.getMaxTimeMS(), // the time limit of each database call (DbOpsUtils)
      references: [
        {
          fieldName: 'schools[]',
          service: SchoolsRest,
          projection: { id: 1, name: 1, type: 1, status: 1, createdTimestamp: 1, modifiedCount: 1 }, // the createdTimestamp and modifiedCount of the referenced school
        },
      ],
      notifications: {
        projection: {
          id: 1,
          name: 1,
          type: 1,
          status: 1,
          email: 1,
          schools: 1,
          createdTimestamp: 1,
          modifiedCount: 1,
        } /* for sync+async */,
      },
    };
    return config;
  },

  /**
   * the access of the caller to the user of a request (/users/:id)
   * the user itself, a portal admin (any user), or an admin of the current school (a member of the school; the route
   * roles allow /users/:id only to admins, and to the user itself)
   * the others: 403 (an existing user that is not a member of the current school) or 404 (no such user)
   * returns { status, value: Access } or { status, error }
   */
  getAccess: async (config, objID, _ctx) => {
    if (objID === _ctx.userID) {
      return { status: 200, value: Private.Access.Self };
    }
    if (Private.isPortalTenant(_ctx)) {
      return { status: 200, value: Private.Access.Portal };
    }

    // the real result: 404 the user does not exist, 403 it exists but it is not a member of the current school
    // (the controllers answer 404 to both, so the existence of a user is not disclosed)
    const notMember = () => {
      const msg = `The user ${objID} is not a member of the current school`;
      return { status: 403, error: { message: msg, error: new Error(msg) } };
    };
    if (!_ctx.tenantID) {
      return notMember();
    }

    const r = await DbOpsUtils.getOne(config, objID, { id: 1, schools: 1 }, _ctx);
    if (r.error) {
      return r;
    }
    if (!r.value.schools?.some((school) => school.id === _ctx.tenantID)) {
      return notMember();
    }

    return { status: 200, value: Private.Access.Member };
  },

  /**
   * the projection to read a user for an access: a portal admin reads only the fields of the portal projection
   */
  getProjectionForAccess: (projection, access) => {
    if (access !== Private.Access.Portal) {
      return projection;
    }

    const fields = Object.keys(projection || {}).filter(
      (field) => projection[field] && Private.PortalProjection[field]
    );
    if (!fields.length) {
      return Private.PortalProjection;
    }
    const entries = fields.map((field) => [field, 1]);
    return { _id: 0, ...Object.fromEntries(entries) };
  },

  /**
   * the response for an access: the schools of another user are not shown (a member: only the current school)
   */
  getResponseForAccess: (r, access, _ctx) => {
    if (r.error || access === Private.Access.Self || !Array.isArray(r.value?.schools)) {
      return r;
    }

    const schools =
      access === Private.Access.Member ? r.value.schools.filter((s) => s.id === _ctx.tenantID) : undefined;
    const value = { ...r.value, schools };
    if (!schools) {
      delete value.schools;
    }
    return { ...r, value };
  },

  /**
   * get the difference that was removed
   */
  getSchoolsDiff: (user, newUser) => {
    let userDiff = {
      ...newUser,
      schools: [],
    };

    // create a map for schools
    let schoolsMap = {};
    for (const school of newUser.schools) {
      schoolsMap[school.id] = school;
    }

    for (const school of user.schools) {
      const newSchool = schoolsMap[school.id];
      if (!newSchool) {
        // the school was removed completely
        userDiff.schools.push(school);
        continue;
      }

      // must check roles
      let schoolDiff = {
        ...school,
        roles: [],
      };
      for (const role of school.roles) {
        // check if role was removed
        if (!newSchool.roles.includes(role)) {
          schoolDiff.roles.push(role);
        }
      }

      if (Object.keys(schoolDiff.roles).length) {
        userDiff.schools.push(schoolDiff);
      }
    }

    return userDiff;
  },

  /**
   * schools notification: the schools referenced by the users (schools[])
   * - modified: the referenced objects are updated (only the older ones, modifiedCount)
   * - removed (the school was deleted): the memberships of the school are removed from the users
   * (a membership is added by an invite or a role, not by a notification)
   * nothing is notified (the memberships are not referenced by other services)
   * a failure is logged and the next schools are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  onSchoolsNotification: async (notification, _ctx) => {
    const config = await Private.getConfig(_ctx);
    const [schoolsRef] = config.references; // the referenced schools (schools[]): the only references of the users
    const changedUsersIDs = new Set();
    let failure = null; // the first failure (the next schools are still done)

    // the modified schools, where they are referenced
    for (const school of notification[Private.Notification.Modified] || []) {
      const referencedSchool = CommonUtils.getProjectedObj(school, schoolsRef.projection);
      const rUpdate = await DbOpsUtils.updateManyReferences(config, schoolsRef, referencedSchool, _ctx);
      if (rUpdate.error) {
        console.log(
          `\n${UsersConstants.ServiceName}: failed to update the referenced school ${school.id}: ${rUpdate.error.message}`
        );
        failure ??= rUpdate;
        continue;
      }
      rUpdate.ids.forEach((id) => changedUsersIDs.add(id));
    }

    // the deleted schools
    for (const school of notification[Private.Notification.Removed] || []) {
      console.log(`\n${UsersConstants.ServiceName}: remove the deleted school ${school.id} from the users`);

      const referencedSchool = CommonUtils.getProjectedObj(school, schoolsRef.projection);
      const rRemove = await DbOpsUtils.deleteManyReferences(config, schoolsRef, referencedSchool, _ctx);
      if (rRemove.error) {
        console.log(
          `\n${UsersConstants.ServiceName}: failed to remove the school ${school.id}: ${rRemove.error.message}`
        );
        failure ??= rRemove;
      }
    }

    return failure || { status: 200, value: [...changedUsersIDs] };
  },
};

const Public = {
  /**
   * init
   */
  init: async () => {
    // the users whose invitation was not used in time are removed regularly
    Private.startPendingCleanup();
  },

  /**
   * get all users for a request: only portal admins (on the portal school), for the users page
   * the schools of the users are not shown and can not be filtered
   * req: { query }
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllForReq: async (req, _ctx) => {
    if (!Private.isPortalTenant(_ctx)) {
      return Private.portalRequired();
    }

    return await Private.getAllForReq(req, Validators.GetPortal, _ctx, (filter) => {
      filter.projection = Private.getProjectionForAccess(filter.projection, Private.Access.Portal);
    });
  },

  /**
   * get all for an internal request (called from signup / invite by email)
   * req: { query }
   * options: the options of the read asked by the calling service (the service token), like { readPreference }
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllInternalForReq: async (req, _ctx, options) => {
    return await Private.getAllForReq(req, Validators.Get, _ctx, null, options);
  },

  /**
   * get all the users that have a role on a school, only for the portal school tenant (portal admins)
   * returns only what a members list needs, other memberships of the users are not exposed
   * req: { query }
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getSchoolMembersForReq: async (schoolID, role, req, _ctx) => {
    if (!Private.isPortalTenant(_ctx)) {
      return Private.portalRequired();
    }

    return await Private.getAllForReq(req, Validators.GetPortal, _ctx, (filter) => {
      filter.filter = {
        $and: [filter.filter || {}, { schools: { $elemMatch: { id: schoolID, roles: role } } }],
      };

      // other memberships of these users are not part of the list
      filter.projection = { _id: 0, id: 1, name: 1, email: 1, status: 1, _lang_en: 1 };
    });
  },

  /**
   * get all portal admins (users with the portal-admin role on the portal school)
   * called only by portal admins (route role)
   */
  getPortalAdminsForReq: async (req, _ctx) => {
    return await Public.getSchoolMembersForReq(
      process.env.SMALL_API_PORTAL_SCHOOL_ID,
      UsersConstants.Roles.PortalAdmin,
      req,
      _ctx
    );
  },

  /**
   * get all admins of a school
   * called only by portal admins (route role)
   */
  getSchoolAdminsForReq: async (schoolID, req, _ctx) => {
    return await Public.getSchoolMembersForReq(schoolID, UsersConstants.Roles.Admin, req, _ctx);
  },

  /**
   * delete a school admin: removes the admin role of the user on that school (the user and its other roles are kept)
   * called only by portal admins (route role, on the portal school); all the admins of a school can be removed,
   * a portal admin can invite a new one when needed
   * returns { status, value } or { status, error }
   */
  deleteSchoolAdmin: async (schoolID, objID, _ctx) => {
    if (!Private.isPortalTenant(_ctx)) {
      return Private.portalRequired();
    }

    const config = await Private.getConfig(_ctx);
    const adminRole = UsersConstants.Roles.Admin;

    // the user must be an admin of the school (read on the primary: an admin given by the request before is found)
    const rUser = await DbOpsUtils.getOne(config, objID, { id: 1, schools: 1 }, _ctx, {
      readPreference: DbOpsUtils.Constants.ReadPrimary,
    });
    if (rUser.error) {
      return rUser;
    }
    if (!rUser.value.schools?.some((school) => school.id === schoolID && school.roles?.includes(adminRole))) {
      const msg = `Not found ${objID}`;
      return { status: 404, error: { message: msg, error: new Error(msg) } };
    }

    // remove only the admin role on that school
    const patchInfo = { remove: { schools: [{ id: schoolID, roles: [adminRole] }] } };
    const r = await Public.patchInternal(objID, patchInfo, Validators.PatchSchool, Private.Action.PatchSchool, _ctx);
    return Private.getResponseForAccess(r, Private.Access.Portal, _ctx);
  },

  /**
   * get all
   * filter: { filter?, projection?, limit?, skip?, sort? }
   * options: the options of the read (DbOpsUtils.getAll), like { readPreference } (the user of a login, of an invite)
   * returns { status, value } or { status, error }
   */
  getAll: async (filter, _ctx, options) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAll(config, filter, _ctx, options);
  },

  /**
   * get all count
   * filter: { filter? }
   * options: the options of the read (DbOpsUtils.getAllCount), like { readPreference }
   * returns { status, value } or { status, error }
   */
  getAllCount: async (filter, _ctx, options) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllCount(config, filter, _ctx, options);
  },

  /**
   * get all by ids: the objects referenced by another service before it writes them (populateReferences) or a read that
   * decides a write (the roles of a user)
   * options: the options of the read, built by the caller (populateReferences and the roles of a user ask the primary:
   *   an object written just before, by an earlier request or by another service, is found)
   * returns { status, value } or { status, error }
   */
  getAllByIDs: async (ids, projection, _ctx, options) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllByIDs(config, ids, projection, _ctx, options);
  },

  /**
   * get one for a request: the user itself, any user for a portal admin, or a member of the current school
   * returns { status, value } or { status, error }
   */
  getOne: async (objID, projection, _ctx) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    const rAccess = await Private.getAccess(config, objID, _ctx);
    if (rAccess.error) {
      return rAccess;
    }
    const access = rAccess.value;

    const accessProjection = Private.getProjectionForAccess(projection, access);
    const r = await DbOpsUtils.getOne(config, objID, accessProjection, _ctx);
    return Private.getResponseForAccess(r, access, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    objInfo.type = UsersConstants.Type;
    objInfo.name = objInfo.name || objInfo.email; // the default name is the email

    // validate
    const v = Validators.Post.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    objInfo.status = UsersConstants.Status.Pending; // add default status pending (removed when its invitation is not used in time)

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
    await EventsRest.raiseEventForObject(UsersConstants.ServiceName, Private.Action.Post, r.value, r.value, _ctx);

    // raise a notification for new obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await UsersRest.raiseNotification(Private.Notification.Added, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    // delete
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.delete(config, objID, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for delete
    await EventsRest.raiseEventForObject(UsersConstants.ServiceName, Private.Action.Delete, r.value, r.value, _ctx);

    // raise a notification for removed obj: the user does not exist anymore, the users referenced by the schools as
    // traces are deleted (see the setting of each school)
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    const removedUser = { ...rnp.value, status: UsersConstants.Status.Deleted };
    let rn = await UsersRest.raiseNotification(Private.Notification.Removed, [removedUser], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
  },

  /**
   * put
   * options: { filter? } a conditional update (see DbOpsUtils.put): 409 when the user does not match the filter
   */
  putInternal: async (objID, objInfo, validator, action, _ctx, options = null) => {
    // validation is done in caller functions
    const v = validator.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // if current user is trying to change the status to disabled, skip it for himself
    if (objID === _ctx.userID && objInfo.status === UsersConstants.Status.Disabled) {
      console.log(`\nSkipping disabling of current user ${objID}`);
      return {
        error: {
          message: 'Skipping disabling status of current user',
          error: new Error('Skipping disabling status of current user'),
        },
        status: 400,
      };
    }

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // no need to take diff before and after for users and trigger notification for deleted schools roles changes

    // populate references
    let rf = await ReferencesUtils.populateReferences({ ...config, fillReferences: true }, objInfo, _ctx);
    if (rf.error) {
      return rf;
    }

    // translate
    await Public.translate(objInfo, _ctx);

    // put
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx, options);
    if (r.error) {
      return r;
    }

    // raise event for put
    await EventsRest.raiseEventForObject(UsersConstants.ServiceName, action, r.value, objInfo, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await UsersRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // since put will not change schools no need to take differences of schools and roles

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
  },

  /**
   * put for a request: the user itself or a member of the current school (profile fields), or a portal admin (the name)
   */
  put: async (objID, objInfo, _ctx) => {
    const config = await Private.getConfig(_ctx);
    const rAccess = await Private.getAccess(config, objID, _ctx);
    if (rAccess.error) {
      return rAccess;
    }
    const access = rAccess.value;

    const validator = access === Private.Access.Portal ? Validators.PutPortal : Validators.Put;
    const r = await Public.putInternal(objID, objInfo, validator, Private.Action.Put, _ctx);
    return Private.getResponseForAccess(r, access, _ctx);
  },

  /**
   * put status: only a portal admin (on the portal school), for any user
   * active <-> disabled, pending -> active | disabled, never back to pending; a portal admin can not disable itself
   */
  putStatus: async (objID, objInfo, _ctx, action = Private.Action.PutStatus) => {
    if (!Private.isPortalTenant(_ctx)) {
      return Private.portalRequired();
    }

    // the response has the default projection (not the schools of the user)
    return await Public.putInternal(objID, objInfo, Validators.PutStatus, action, _ctx);
  },

  /**
   * activate (internal) called from users-auth at login: a pending user becomes active
   * a user that is not pending is not changed (an active user stays active, a disabled user stays disabled): the
   * status is changed only if it is still pending when it is written (one conditional write), so a disable done
   * meanwhile is never overwritten
   * returns { status, value } with the current status of the user, or { status, error }
   */
  activate: async (objID, _ctx) => {
    // active: not pending anymore (no expiry)
    const objInfo = { status: UsersConstants.Status.Active };
    const options = { filter: { status: UsersConstants.Status.Pending } };
    const r = await Public.putInternal(objID, objInfo, Validators.Activate, Private.Action.Activate, _ctx, options);
    if (r.status !== 409) {
      return r;
    }

    // not pending (anymore): the user is not changed, its current status is returned
    return await Private.getCurrentStatus(objID, _ctx);
  },

  /**
   * remove the users whose invitation was not used in time (pending and created longer than
   * ConfigSettings.getPendingExpiresIn ago): the user is deleted, its pending records in the schools are deleted and
   * its login too (the removed notification; the traces of an earlier account with the same id stay as they are)
   * (a pending portal admin too: while no portal admin is active, the next start invites the configured one again)
   * a failure is logged and the next users are still removed
   * returns { status, value: [ removed ids ] } or { status, error }
   */
  deleteExpiredPending: async (_ctx) => {
    const config = await Private.getConfig(_ctx);
    const expiresIn = ConfigSettings.getPendingExpiresIn() * 1000;
    const expiredBefore = new Date(Date.now() - expiresIn).toISOString();
    const filter = {
      filter: { status: UsersConstants.Status.Pending, createdTimestamp: { $lt: expiredBefore } },
      projection: { _id: 0, id: 1, email: 1 },
      limit: Private.PendingCleanupBatch,
    };
    // read on the primary: a user that logged in just before is still pending on a secondary, it would be removed
    const rUsers = await DbOpsUtils.getAll(config, filter, _ctx, { readPreference: DbOpsUtils.Constants.ReadPrimary });
    if (rUsers.error) {
      return rUsers;
    }

    const removedIDs = [];
    for (const user of rUsers.value) {
      console.log(`\n${UsersConstants.ServiceName}: the invitation of ${user.id} was not used in time: it is removed`);
      const r = await Public.delete(user.id, _ctx);
      if (r.error) {
        console.log(
          `\n${UsersConstants.ServiceName}: failed to remove the pending user ${user.id}: ${r.error.message}`
        );
        continue;
      }
      removedIDs.push(user.id);
    }

    return { status: 200, value: removedIDs };
  },

  putEmail: async (objID, objInfo, _ctx) => {
    // called from users-auth
    return await Public.putInternal(objID, objInfo, Validators.PutEmail, Private.Action.PutEmail, _ctx);
  },

  /**
   * patch
   */
  patchInternal: async (objID, patchInfo, validator, action, _ctx) => {
    // validate
    const v = validator.validate(patchInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, patchInfo, _ctx);
    }
    patchInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // the status is changed by putStatus (its guard: a user does not disable itself), never by a patch

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    // need to take diff before and after for users and trigger notification for deleted schools roles changes (read on
    // the primary: the diff decides the notification, a change made by the request before must be in it)
    const rget = await DbOpsUtils.getOne(config, objID, projection, _ctx, {
      readPreference: DbOpsUtils.Constants.ReadPrimary,
    });
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

    // a membership without roles is not a membership: removed with its last role (in the same patch)
    if (action === Private.Action.PatchSchool) {
      patchInfo.removeWhere = { schools: { roles: { $size: 0 } } };
    }

    // patch
    const r = await DbOpsUtils.patch(config, objID, patchInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for patch
    await EventsRest.raiseEventForObject(UsersConstants.ServiceName, action, r.value, patchInfo, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await UsersRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // take the difference and notify removed schools roles
    let rdiff = { status: 200, value: Private.getSchoolsDiff(rget.value, r.value) };
    if (Object.keys(rdiff.value.schools).length) {
      let rp = BaseServiceUtils.getProjectedResponse(rdiff, config.notifications.projection /* for sync+async */, _ctx);
      let rndiff = await UsersRest.raiseNotification(Private.Notification.Removed, [rp.value], _ctx);
    }

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
  },

  /**
   * patch for a request: the user itself or a member of the current school (profile fields), or a portal admin (the name)
   */
  patch: async (objID, patchInfo, _ctx) => {
    const config = await Private.getConfig(_ctx);
    const rAccess = await Private.getAccess(config, objID, _ctx);
    if (rAccess.error) {
      return rAccess;
    }
    const access = rAccess.value;

    const validator = access === Private.Access.Portal ? Validators.PatchPortal : Validators.Patch;
    const r = await Public.patchInternal(objID, patchInfo, validator, Private.Action.Patch, _ctx);
    return Private.getResponseForAccess(r, access, _ctx);
  },

  /**
   * patch status: only a portal admin (on the portal school), for any user
   * active <-> disabled, pending -> active | disabled, never back to pending; a portal admin can not disable itself
   */
  patchStatus: async (objID, patchInfo, _ctx) => {
    if (!Private.isPortalTenant(_ctx)) {
      return Private.portalRequired();
    }

    // validate, then the same change as put (a deleted account is not changed)
    const v = Validators.PatchStatus.validate(patchInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, patchInfo, _ctx);
    }
    patchInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    const r = await Public.putStatus(objID, patchInfo.set, _ctx, Private.Action.PatchStatus);
    return Private.getResponseForAccess(r, Private.Access.Portal, _ctx);
  },

  patchSchool: async (objID, patchInfo, _ctx) => {
    // called from users-auth by school admin
    return await Public.patchInternal(objID, patchInfo, Validators.PatchSchool, Private.Action.PatchSchool, _ctx);
  },

  /**
   * notification: the objects referenced by the users follow their sources (each source has its own flow)
   * - schools: the schools referenced by the memberships of the users (a deleted school: its memberships are removed)
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
      case SchoolsRest.Constants.ServiceName:
        return await Private.onSchoolsNotification(notification, _ctx);
      default:
        console.log(
          `\n${UsersConstants.ServiceName}: notification of ${notification.serviceName} ignored (no reference to it)`
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
  Constants: UsersConstants,
};
