/**
 * Schools service
 */
const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const DatabaseManagerUtils = require('../../core/utils/database-manager.utils.js');
const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const TranslationsUtils = require('../../core/utils/translations.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const ConfigSettings = require('../config.settings.js');

const ReferencesUtils = require('../../core/utils/base-service.references.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const EventsRest = require('../rest/events.rest.js');
const SchoolsRest = require('../rest/schools.rest.js');
const SchoolsConstants = require('./schools.constants.js');
const SchoolsDatabase = require('./schools.database.js');

/**
 * validation
 */
const Schema = {
  School: Joi.object().keys({
    name: Joi.string().trim().min(1).max(64), // without the spaces around it (only spaces: refused)
    description: Joi.string().min(0).max(1024).allow(null),
    status: Joi.string()
      .min(1)
      .max(64)
      .valid(...Object.values(SchoolsConstants.Status)),
  }),
};

// the status of a change: a school is pending only from its creation (the signup) until the first login of one of its
// members, which makes it active; it never goes back to pending
Schema.SchoolChange = Schema.School.keys({
  status: Joi.string().valid(SchoolsConstants.Status.Active, SchoolsConstants.Status.Disabled),
});

const Validators = {
  Get: {
    filter: ['id', 'name', 'description', 'status'], // some have index
    sort: { name: 1 },
  },

  Post: Schema.School.fork(['name'], (x) => x.required() /*make required */).keys({
    id: Joi.string().uuid(),
    type: Joi.string().valid(SchoolsConstants.Type),
  }),

  Put: Schema.SchoolChange.min(1), // a change has at least one field

  Patch: Joi.object()
    .keys({
      // for patch allowed operations are add, remove, set, unset
      set: Schema.SchoolChange,
      unset: Joi.array().items(Joi.string().min(1).max(128).valid('description')),
    })
    .min(1), // a change has at least one operation

  // the settings of a school (its admins)
  Settings: Joi.object().keys({
    removedMembers: Joi.string()
      .valid(...Object.values(SchoolsConstants.Settings.RemovedMembers))
      .required(),
    classmates: Joi.string().valid(...Object.values(SchoolsConstants.Settings.Classmates)), // none: show
  }),

  // the internal change of the activation (never from a request)
  Activate: Joi.object().keys({
    status: Joi.string().valid(SchoolsConstants.Status.Active).required(),
  }),
};

const Private = {
  Action: {
    ...BaseServiceUtils.Constants.Action,
    Activate: 'activate',
    Settings: 'settings',
    Expire: 'expire',
  },

  /**
   * the timer of the cleanup of the pending schools (see Public.deleteExpiredPending), and the most schools removed at
   * once
   */
  PendingCleanupTimer: null,
  PendingCleanupBatch: 100,

  /**
   * start the regular cleanup of the schools whose signup was not followed by a login in time (every pod runs it: a
   * school removed by another pod is not found, which is fine); the timer does not keep the process alive
   */
  startPendingCleanup: () => {
    // an init again (the tests) starts it again
    clearInterval(Private.PendingCleanupTimer);

    // every hour, or as often as the expiry when it is shorter (SMALL_API_PENDING_EXPIRES_IN): a pending record is
    // removed at most one interval after it expired
    const expiresIn = ConfigSettings.getPendingExpiresIn();
    const interval = Math.min(SchoolsConstants.PendingCleanupInterval, expiresIn) * 1000;
    console.log(
      `\n${SchoolsConstants.ServiceName}: the pending schools expire ${expiresIn} s after they were created, checked every ${interval / 1000} s`
    );
    Private.PendingCleanupTimer = setInterval(async () => {
      // the events of the cleanup are written in the log of the portal school
      const cleanupUser = EventsRest.Constants.NoLoginUsers.PendingCleanup;
      const _ctx = {
        reqID: 'SchoolsPendingCleanup',
        lang: 'en',
        tenantID: process.env.SMALL_API_PORTAL_SCHOOL_ID,
        userID: cleanupUser,
        username: cleanupUser,
      };
      try {
        const r = await Public.deleteExpiredPending(_ctx);
        if (r.error) {
          console.log(
            `\n${SchoolsConstants.ServiceName}: the cleanup of the pending schools failed: ${r.error.message}`
          );
        }
      } catch (e) {
        console.log(
          `\n${SchoolsConstants.ServiceName}: the cleanup of the pending schools failed: ${CommonUtils.getLogError(e)}`
        );
      }
    }, interval);
    Private.PendingCleanupTimer.unref();
  },

  /**
   * put a school (the change of a request, or an internal change with its own validator and event)
   * options: { filter? } a conditional update (see DbOpsUtils.put): 409 when the school does not match the filter
   */
  putInternal: async (objID, objInfo, validator, action, _ctx, options = null) => {
    // validate
    const v = validator.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // prevent changing the portal school status or its name
    if (Private.isPortalSchool(objID) && objInfo.status && objInfo.status !== SchoolsConstants.Status.Active) {
      const msg = 'The portal school cannot be deactivated';
      return { status: 403, error: { message: msg, error: new Error(msg) } };
    }
    if (Private.isPortalSchool(objID) && objInfo.name !== undefined) {
      return Private.errorPortalRename();
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

    // put
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.put(config, objID, objInfo, projection, _ctx, options);
    if (r.error) {
      return r;
    }

    // raise event for put
    await EventsRest.raiseEventForObject(SchoolsConstants.ServiceName, action, r.value, objInfo, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await SchoolsRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
  },
  Notification: NotificationsUtils.Constants.Notification,

  /**
   * the portal school keeps its name (its name is not part of a change)
   */
  errorPortalRename: () => {
    const msg = 'The portal school cannot be renamed';
    return { status: 403, error: { message: msg, error: new Error(msg) } };
  },

  /**
   * check whether the ID belongs to the protected portal school
   */
  isPortalSchool: (schoolID) =>
    !!process.env.SMALL_API_PORTAL_SCHOOL_ID && schoolID === process.env.SMALL_API_PORTAL_SCHOOL_ID,

  /**
   * config
   * returns { serviceName, collection, maxTimeMS, schema, translate, references, fillReferences, events }
   */
  getConfig: async (_ctx) => {
    const config = {
      serviceName: SchoolsConstants.ServiceName,
      collection: await SchoolsDatabase.collection(_ctx),
      maxTimeMS: DatabaseManagerUtils.getMaxTimeMS(), // the time limit of each database call (DbOpsUtils)
      references: [], // to be populated (like foreign keys)
      notifications: { projection: null /*use default, is for sync+async */ },
    };
    return config;
  },
};

const Public = {
  /**
   * init
   */
  init: async () => {
    // the schools whose signup was not followed by a login in time are removed regularly
    Private.startPendingCleanup();
  },

  /**
   * get all for a request
   * req: { query }
   * options: { readPreference? } the options of the read asked by a calling service (in its token: the targets of
   *   its references are read on the primary, { readPreference: DbOpsUtils.Constants.ReadPrimary }), optional
   * returns: { status, value: {data, meta} } or { status, error }
   */
  getAllForReq: async (req, _ctx, options) => {
    // convert query to mongo build filter: { filter, projection, limit, skip, sort }
    const rf = await RestApiUtils.buildFilterFromReq(req, Validators.Get, _ctx);
    if (rf.error) {
      return rf;
    }
    const filter = rf.value;

    // exclude the portal school from the managed list of a user (a call of another service reads the targets of its
    // references: the portal school too)
    if (process.env.SMALL_API_PORTAL_SCHOOL_ID && !req.isS2SCall) {
      filter.filter = {
        $and: [filter.filter || {}, { id: { $ne: process.env.SMALL_API_PORTAL_SCHOOL_ID } }],
      };
    }

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
   * get all
   * filter: { filter?, projection?, limit?, skip?, sort? }
   * options: { readPreference? } the options of the read (DbOpsUtils)
   * returns { status, value } or { status, error }
   */
  getAll: async (filter, _ctx, options) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAll(config, filter, _ctx, options);
  },

  /**
   * get all count
   * filter: { filter? }
   * options: { readPreference? } the options of the read (DbOpsUtils)
   * returns { status, value } or { status, error }
   */
  getAllCount: async (filter, _ctx, options) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllCount(config, filter, _ctx, options);
  },

  /**
   * get all by ids: the objects referenced by another service before it writes them (populateReferences) or a read that
   * decides a write (the roles of a user)
   * options: { readPreference? } the options of the read, built by the caller (populateReferences and the roles of a
   *   user ask the primary, { readPreference: DbOpsUtils.Constants.ReadPrimary }: an object written just before, by
   *   an earlier request or by another service, is found)
   * returns { status, value } or { status, error }
   */
  getAllByIDs: async (ids, projection, _ctx, options) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getAllByIDs(config, ids, projection, _ctx, options);
  },

  /**
   * get one
   * returns { status, value } or { status, error }
   */
  getOne: async (objID, projection, _ctx) => {
    const config = await Private.getConfig(_ctx); // { serviceName, collection }
    return await DbOpsUtils.getOne(config, objID, projection, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    objInfo.type = SchoolsConstants.Type;
    objInfo.status = objInfo.status || SchoolsConstants.Status.Pending; // add default status if not set

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
    await EventsRest.raiseEventForObject(SchoolsConstants.ServiceName, Private.Action.Post, r.value, r.value, _ctx);

    // raise a notification for new obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await SchoolsRest.raiseNotification(Private.Notification.Added, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
  },

  /**
   * delete
   * action: the action of the event (delete, or expire for a pending school removed by the cleanup)
   */
  delete: async (objID, _ctx, action = Private.Action.Delete) => {
    // prevent deletion of the portal school
    if (Private.isPortalSchool(objID)) {
      const msg = 'The portal school cannot be deleted';
      return { status: 403, error: { message: msg, error: new Error(msg) } };
    }

    // { serviceName, collection, references, notifications.projection }
    const config = await Private.getConfig(_ctx);

    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const r = await DbOpsUtils.delete(config, objID, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for delete
    await EventsRest.raiseEventForObject(SchoolsConstants.ServiceName, action, r.value, r.value, _ctx);

    // raise a notification for removed obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await SchoolsRest.raiseNotification(Private.Notification.Removed, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    return await Private.putInternal(objID, objInfo, Validators.Put, Private.Action.Put, _ctx);
  },

  /**
   * activate (internal) called from users-auth when a member is authenticated: a pending school becomes active
   * the decision is taken on the school (not on the school referenced by the user): a school that is not pending is
   * not changed, and the status is changed only if it is still pending when it is written (one conditional write), so
   * a disable done meanwhile is never overwritten
   * returns { status, value } with the current status of the school, or { status, error }
   */
  activate: async (objID, _ctx) => {
    // active: not pending anymore (no expiry)
    const objInfo = { status: SchoolsConstants.Status.Active };
    const options = { filter: { status: SchoolsConstants.Status.Pending } };
    const r = await Private.putInternal(objID, objInfo, Validators.Activate, Private.Action.Activate, _ctx, options);
    if (r.status !== 409) {
      return r;
    }

    // not pending (anymore): the school is not changed, its current status is returned (the write changed nothing,
    // there is no object in its answer: read on the primary)
    const config = await Private.getConfig(_ctx);
    const projection = BaseServiceUtils.getProjection(config, _ctx); // combined default projection + notifications.projection
    const rget = await DbOpsUtils.getOne(config, objID, projection, _ctx, {
      readPreference: DbOpsUtils.Constants.ReadPrimary,
    });
    return BaseServiceUtils.getProjectedResponse(rget, null /*default projection */, _ctx);
  },

  /**
   * the settings of a school, with the defaults of the ones that are not set
   * returns { status, value: settings } or { status, error }
   */
  getSettings: async (objID, _ctx) => {
    const config = await Private.getConfig(_ctx);
    // read on the primary: the settings decide what happens to a removed member, and the page reads them after a save
    const options = { readPreference: DbOpsUtils.Constants.ReadPrimary };
    const r = await DbOpsUtils.getOne(config, objID, { _id: 0, id: 1, settings: 1 }, _ctx, options);
    if (r.error) {
      return r;
    }
    return { status: 200, value: { ...SchoolsConstants.DefaultSettings, ...r.value.settings } };
  },

  /**
   * put the settings of a school (its admins); removedMembers: what happens to the records of a member whose role is
   * removed or whose account is deleted (keep them as traces, or delete them); classmates: a student sees the other
   * students of its groups and schedules (show) or only itself (hide)
   * returns { status, value: settings } or { status, error }
   */
  putSettings: async (objID, settings, _ctx) => {
    // validate
    const v = Validators.Settings.validate(settings);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, settings, _ctx);
    }
    settings = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // put
    const config = await Private.getConfig(_ctx);
    const projection = { _id: 0, id: 1, name: 1, type: 1, settings: 1 };
    const r = await DbOpsUtils.put(config, objID, { settings }, projection, _ctx);
    if (r.error) {
      return r;
    }

    // raise event for the settings (the settings are not referenced by other services: no notification)
    await EventsRest.raiseEventForObject(
      SchoolsConstants.ServiceName,
      Private.Action.Settings,
      r.value,
      settings,
      _ctx
    );

    return { status: 200, value: { ...SchoolsConstants.DefaultSettings, ...r.value.settings } };
  },

  /**
   * remove the schools whose signup was not followed by a login in time (pending and created longer than
   * ConfigSettings.getPendingExpiresIn ago): the school is deleted, and its memberships are removed from the users (the removed
   * notification); its first admin, invited at the signup, expires too (the cleanup of the users)
   * a failure is logged and the next schools are still removed
   * returns { status, value: [ removed ids ] } or { status, error }
   */
  deleteExpiredPending: async (_ctx) => {
    const config = await Private.getConfig(_ctx);
    const expiresIn = ConfigSettings.getPendingExpiresIn() * 1000;
    const expiredBefore = new Date(Date.now() - expiresIn).toISOString();
    const filter = {
      filter: { status: SchoolsConstants.Status.Pending, createdTimestamp: { $lt: expiredBefore } },
      projection: { _id: 0, id: 1, name: 1 },
      limit: Private.PendingCleanupBatch,
    };
    // read on the primary: a school activated just before is still pending on a secondary, it would be removed
    const rSchools = await DbOpsUtils.getAll(config, filter, _ctx, {
      readPreference: DbOpsUtils.Constants.ReadPrimary,
    });
    if (rSchools.error) {
      return rSchools;
    }

    const removedIDs = [];
    for (const school of rSchools.value) {
      console.log(
        `\n${SchoolsConstants.ServiceName}: nobody logged in to the school ${school.id} in time: it is removed`
      );
      const r = await Public.delete(school.id, _ctx, Private.Action.Expire);
      if (r.error) {
        console.log(
          `\n${SchoolsConstants.ServiceName}: failed to remove the pending school ${school.id}: ${r.error.message}`
        );
        continue;
      }
      removedIDs.push(school.id);
    }

    return { status: 200, value: removedIDs };
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    // validate
    const v = Validators.Patch.validate(patchInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, patchInfo, _ctx);
    }
    patchInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // prevent changing the portal school status
    if (
      Private.isPortalSchool(objID) &&
      patchInfo.set?.status &&
      patchInfo.set.status !== SchoolsConstants.Status.Active
    ) {
      const msg = 'The portal school cannot be deactivated';
      return { status: 403, error: { message: msg, error: new Error(msg) } };
    }
    if (Private.isPortalSchool(objID) && patchInfo.set?.name !== undefined) {
      return Private.errorPortalRename();
    }

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
    await EventsRest.raiseEventForObject(SchoolsConstants.ServiceName, Private.Action.Patch, r.value, patchInfo, _ctx);

    // raise a notification for modified obj
    let rnp = BaseServiceUtils.getProjectedResponse(r, config.notifications.projection /* for sync+async */, _ctx);
    let rn = await SchoolsRest.raiseNotification(Private.Notification.Modified, [rnp.value], _ctx);

    // success
    return BaseServiceUtils.getProjectedResponse(r, null /*default projection */, _ctx);
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
    notification = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // the schools reference no objects of other services: nothing to do (no subscription)
    console.log(
      `\n${SchoolsConstants.ServiceName}: notification of ${notification.serviceName} ignored (no reference to it)`
    );
    return { status: 200, value: false };
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
  Constants: SchoolsConstants,
};
