/**
 * Users service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils');
const TranslationsUtils = require('../../core/utils/translations.utils.js');
const CommonUtils = require('../../core/utils/common.utils');
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
    name: Joi.string().min(1).max(128),
    birthday: Joi.date().iso(),
    phoneNumber: Joi.string()
      .min(1)
      .max(32)
      .regex(/^(\d|\+|\-|\.|' ')*$/), // allow 0-9 + - . in any order
    address: Joi.string().min(1).max(256),
  }),

  // what a portal admin can change of another user (the other profile fields are personal, the email is the login)
  UserName: Joi.object().keys({
    name: Joi.string().min(1).max(128),
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
    name: Joi.string().min(1).max(128),
    type: Joi.string().valid(UsersConstants.Type),
    schools: SchemaSchools,
  }).fork(['email', 'schools'], (x) => x.required() /*make required */),

  // profile fields only: the status is global (all the schools of the user) and has its own route (portal admin)
  Put: Schema.UserProfile,
  PutPortal: Schema.UserName,
  PutStatus: Schema.UserStatus,
  PutEmail: Schema.UserEmail.fork(['email'], (x) => x.required() /*make required */),

  Patch: Joi.object().keys({
    // for patch allowed operations are set, unset
    set: Schema.UserProfile,
    unset: Joi.array().items(Joi.string().min(1).max(128).valid('phoneNumber')),
  }),
  PatchPortal: Joi.object().keys({
    set: Schema.UserName,
  }),
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
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllForReq: async (req, schema, _ctx, restrictFilter = null) => {
    // convert query to mongo build filter: { filter, projection, limit, skip, sort }
    const rf = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    if (rf.error) {
      return rf;
    }
    const filter = rf.value;

    // optional restriction applied by the caller (like the portal admins list)
    restrictFilter?.(filter);

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
   * config
   * returns { serviceName, collection, schema, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: UsersConstants.ServiceName,
      collection: await UsersDatabase.collection(_ctx),
      references: [
        {
          fieldName: 'schools[]',
          service: SchoolsRest,
          projection: null /*default*/,
        },
      ],
      notifications: {
        projection: { id: 1, name: 1, type: 1, status: 1, email: 1, schools: 1 } /* for sync+async */,
      },
    };
    return config;
  },

  /**
   * the access of the caller to the user of a request (/users/:id)
   * the user itself, a portal admin (any user), or an admin of the current school (a member of the school; the route
   * roles allow /users/:id only to admins, and to the user itself)
   * the others are reported as not found (their existence is not disclosed)
   * returns { status, value: Access } or { status, error }
   */
  getAccess: async (config, objID, _ctx) => {
    if (objID === _ctx.userID) {
      return { status: 200, value: Private.Access.Self };
    }
    if (Private.isPortalTenant(_ctx)) {
      return { status: 200, value: Private.Access.Portal };
    }

    const notFound = () => {
      const msg = `Not found ${objID}`;
      return { status: 404, error: { message: msg, error: new Error(msg) } };
    };
    if (!_ctx.tenantID) {
      return notFound();
    }

    const r = await DbOpsUtils.getOne(config, objID, { id: 1, schools: 1 }, _ctx);
    if (r.error) {
      return r;
    }
    if (!r.value.schools?.some((school) => school.id === _ctx.tenantID)) {
      return notFound();
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
    return { _id: 0, ...Object.fromEntries(fields.map((field) => [field, 1])) };
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
};

const Public = {
  /**
   * init
   */
  init: async () => {},

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
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllInternalForReq: async (req, _ctx) => {
    return await Private.getAllForReq(req, Validators.Get, _ctx);
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

    // the user must be an admin of the school
    const rUser = await DbOpsUtils.getOne(config, objID, { id: 1, schools: 1 }, _ctx);
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
   * returns { status, value } or { status, error }
   */
  getAll: async (filter, _ctx) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAll(config, filter, _ctx);
  },

  /**
   * get all count
   * filter: { filter? }
   * returns { status, value } or { status, error }
   */
  getAllCount: async (filter, _ctx) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllCount(config, filter, _ctx);
  },

  /**
   * get all by ids
   * returns { status, value } or { status, error }
   */
  getAllByIDs: async (ids, projection, _ctx) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllByIDs(config, ids, projection, _ctx);
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

    const r = await DbOpsUtils.getOne(config, objID, Private.getProjectionForAccess(projection, access), _ctx);
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

    objInfo.status = UsersConstants.Status.Pending; // add default status pending

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

    // raise a notification for removed obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await UsersRest.raiseNotification(Private.Notification.Removed, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
  },

  /**
   * put
   */
  putInternal: async (objID, objInfo, validator, action, _ctx) => {
    // validation is done in caller functions
    const v = validator.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

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
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx);
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
  putStatus: async (objID, objInfo, _ctx) => {
    if (!Private.isPortalTenant(_ctx)) {
      return Private.portalRequired();
    }

    // the response has the default projection (not the schools of the user)
    return await Public.putInternal(objID, objInfo, Validators.PutStatus, Private.Action.PutStatus, _ctx);
  },

  /**
   * activate (internal) called from users-auth at login: a pending user becomes active
   * a user that is not pending is not changed (an active user stays active, a disabled user stays disabled)
   * returns { status, value } with the current status of the user, or { status, error }
   */
  activate: async (objID, _ctx) => {
    const config = await Private.getConfig(_ctx);
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection

    const rget = await DbOpsUtils.getOne(config, objID, projection, _ctx);
    if (rget.error) {
      return rget;
    }
    if (rget.value.status !== UsersConstants.Status.Pending) {
      return BaseServiceUtils.getProjectedResponse(rget, null /*default projection */, _ctx);
    }

    const objInfo = { status: UsersConstants.Status.Active };
    return await Public.putInternal(objID, objInfo, Validators.PutStatus, Private.Action.Activate, _ctx);
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

    // if current user is trying to change the status to disabled, skip it for himself
    if (objID === _ctx.userID && patchInfo.set?.status === UsersConstants.Status.Disabled) {
      console.log(`\nSkipping disabling status of current user ${objID}`);
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

    // need to take diff before and after for users and trigger notification for deleted schools roles changes
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

    const r = await Public.patchInternal(objID, patchInfo, Validators.PatchStatus, Private.Action.PatchStatus, _ctx);
    return Private.getResponseForAccess(r, Private.Access.Portal, _ctx);
  },

  patchSchool: async (objID, patchInfo, _ctx) => {
    // called from users-auth by school admin
    return await Public.patchInternal(objID, patchInfo, Validators.PatchSchool, Private.Action.PatchSchool, _ctx);
  },

  /**
   * notification
   */
  notification: async (notification, _ctx) => {
    // validate
    const v = NotificationsUtils.getNotificationSchema().validate(notification);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, notification, _ctx);
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
  Constants: UsersConstants,
};
