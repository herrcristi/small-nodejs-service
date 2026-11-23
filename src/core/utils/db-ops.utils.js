/**
 * Database operation utils
 *
 * every database call carries the time limit of the application (DatabaseManagerUtils.getTimeLimit: { maxTimeMS }):
 * the server stops a call that runs longer and the request answers 503
 */
const CommonUtils = require('./common.utils.js');
const DatabaseManagerUtils = require('./database-manager.utils.js');
const DbOpsArrayUtils = require('./db-ops.array.utils.js');

const Constants = {
  // the options of a read that must see the writes just done: the reads go to the secondaries (the readPreference of
  // the client), which may not have a write yet; the primary has every acknowledged write
  // used by a read after a write that returned no object (updateMany, a conditional write that matched nothing) and by
  // the notifications, which are handled inside the request that wrote the change
  // (the object of a write that returns it, put / patch / delete, is its result: it is never read again)
  ReadPrimary: { readPreference: 'primary' },
};

const Utils = {
  /**
   * error
   */
  error: (status, msg, time, _ctx) => {
    return {
      status,
      error: { message: msg, error: new Error(msg) },
      time: new Date() - time /*milliseconds*/,
    };
  },

  // the error code of MongoDB for a value that is already used in a unique index
  DuplicateKeyCode: 11000,

  // the error of the driver when no connection of the pool is free in time (the waitQueueTimeoutMS of the pool)
  WaitQueueTimeoutName: 'MongoWaitQueueTimeoutError',

  // the error code of MongoDB for a call stopped by its time limit (maxTimeMS), also when a write waited too long for
  // the replicas (then the write may be done on the primary)
  MaxTimeExpiredCode: 50,

  exception: (e, time, _ctx) => {
    // a value that must be unique is already used (a unique index): a conflict the user can fix, with the fields of
    // the index (not the text of the driver, which names the collection and the value)
    if (e?.code === Utils.DuplicateKeyCode) {
      const fields = Object.keys(e.keyPattern || {}).join(', ') || 'value';
      const msg = `"${fields}" is already used`;
      console.log(`\nDB Calling: duplicate key: ${e.message}`);
      return { status: 409, error: { message: msg, error: new Error(msg) }, time: new Date() - time };
    }

    // the database is busy (every connection of the pool is used): the request can be sent again later (503), it does
    // not wait for ever
    if (e?.name === Utils.WaitQueueTimeoutName) {
      console.log(`\nDB Calling: no free connection: ${e.message}`);
      return Utils.error(503, 'No free database connection in time', time, _ctx);
    }

    // the database call ran longer than its time limit: the server stopped it (503, as above)
    if (e?.code === Utils.MaxTimeExpiredCode) {
      console.log(`\nDB Calling: time limit: ${e.message}`);
      return Utils.error(503, 'The database call ran longer than its time limit', time, _ctx);
    }

    return {
      status: 500,
      error: { message: e.message || e, error: e },
      time: new Date() - time /*milliseconds*/,
    };
  },

  /**
   * a write that matched nothing: without an extra filter the object does not exist (404); with an extra filter the
   * object may exist and not match it (409: it was changed by somebody else, like a status that is not pending anymore)
   */
  notMatched: async (config, objID, extraFilter, time, _ctx) => {
    if (!extraFilter) {
      return Utils.error(404, `Not found ${objID}`, time, _ctx);
    }

    // the write was done on the primary: its answer is read there too
    const timeLimit = DatabaseManagerUtils.getTimeLimit();
    const count = await config.collection.countDocuments(
      { id: objID },
      { limit: 1, ...Constants.ReadPrimary, ...timeLimit }
    );
    if (!count) {
      return Utils.error(404, `Not found ${objID}`, time, _ctx);
    }
    return Utils.error(409, `Not changed ${objID}: it does not match the filter`, time, _ctx);
  },

  /**
   * get references fields (filter and update) to be used in updateMany
   */
  getReferencesUpdateMany: (referenceFieldName, objInfo, _ctx) => {
    // examples of fieldName:
    // user, schools[], schedules[].location, etc

    // process fields in reverse order
    const fields = referenceFieldName.split('.').reverse();

    const filterFields = ['id'];
    const updateFields = [];
    const arrayFilters = [];

    for (const field of fields) {
      const isArray = field.includes('[]');
      if (isArray) {
        const fieldSimple = field.replace('[]', '');
        filterFields.push(fieldSimple);
        updateFields.push(`${fieldSimple}.$[${fieldSimple}]`);

        const arrayFieldName = [...filterFields].reverse().join('.');
        arrayFilters.push({ [arrayFieldName]: objInfo.id });
      } else {
        filterFields.push(field);
        updateFields.push(field);
      }
    }
    filterFields.reverse();
    updateFields.reverse();
    arrayFilters.reverse();

    return {
      filterField: filterFields.join('.'),
      updateField: updateFields.join('.'),
      arrayFilters,
    };
  },

  /**
   * the filter of one object to update: the fields under prefix hold an older version of the notified object, the same
   * object (the same createdTimestamp) with a smaller or missing modifiedCount, or an object with the same id that was
   * created again (another createdTimestamp, or none); only these objects are updated, so a change that comes back
   * through a cycle of notifications, or a late notification of an older change, changes nothing
   * prefix: '' (the object itself, inside $elemMatch) or its path ('user', 'schools', 'schedules.location')
   * objInfo: the object, with its modifiedCount
   */
  getFilterForOneObjectToUpdate: (prefix, objInfo) => {
    const field = (name) => (prefix ? `${prefix}.${name}` : name);
    const olderCount = { $not: { $gte: objInfo.modifiedCount } };
    if (typeof objInfo.createdTimestamp !== 'string') {
      return { [field('modifiedCount')]: olderCount };
    }

    const sameObject = { [field('createdTimestamp')]: objInfo.createdTimestamp, [field('modifiedCount')]: olderCount };
    const createdAgain = { [field('createdTimestamp')]: { $ne: objInfo.createdTimestamp } };
    return { $or: [sameObject, createdAgain] };
  },

  /**
   * a filter moved under a prefix: { id } -> { 'user.id' }, also inside $or
   */
  prefixFilter: (filter, prefix) => {
    const prefixed = {};
    for (const key in filter) {
      if (key === '$or') {
        prefixed.$or = filter.$or.map((condition) => Utils.prefixFilter(condition, prefix));
        continue;
      }
      prefixed[`${prefix}.${key}`] = filter[key];
    }
    return prefixed;
  },

  /**
   * the filter of the objects to update: the ones that hold an older version of the notified object (see
   * getFilterForOneObjectToUpdate)
   * user -> { 'user.id': id, $or: [ { 'user.createdTimestamp': c, 'user.modifiedCount': older }, ... ] }
   * students[] -> { students: { $elemMatch: { id, $or: [...] } } }
   * schedules[].location -> { schedules: { $elemMatch: { 'location.id': id, $or: [ ...'location.' fields ] } } }
   */
  getFilterForObjectsToUpdate: (fieldName, objInfo) => {
    // from the notified object to the object that holds it
    const segments = fieldName.split('.').reverse();
    const objectFilter = Utils.getFilterForOneObjectToUpdate('', objInfo);
    let filter = { id: objInfo.id, ...objectFilter };
    for (const segment of segments) {
      const field = segment.replace('[]', '');
      if (segment.endsWith('[]')) {
        filter = { [field]: { $elemMatch: filter } };
        continue;
      }
      filter = Utils.prefixFilter(filter, field);
    }
    return filter;
  },

  /**
   * the array filters of the objects to update in arrays (see getReferencesUpdateMany): only the older versions of the
   * notified object
   * [ { 'schedules.location.id': id } ] -> [ { 'schedules.location.id': id, $or: [ ...'schedules.location.' fields ] } ]
   */
  getArrayFiltersForObjectsToUpdate: (arrayFilters, objInfo) => {
    return arrayFilters.map((arrayFilter) => {
      const idKey = Object.keys(arrayFilter)[0]; // schedules.location.id
      const objectPrefix = idKey.replace(/\.id$/, ''); // schedules.location
      return { ...arrayFilter, ...Utils.getFilterForOneObjectToUpdate(objectPrefix, objInfo) };
    });
  },
};

const Public = {
  Constants,

  /**
   * get all
   * config: { serviceName, collection }
   * filter: { filter, projection, limit, skip, sort }
   * options: Constants.ReadPrimary to see the writes just done, otherwise null (a secondary may answer)
   * return: { status, value } or { status, error: { message, error } }
   */
  getAll: async (config, filter, _ctx, options = null) => {
    const time = new Date();
    const logFilter = JSON.stringify(filter, CommonUtils.stringifyFilter, 2);

    try {
      const { filter: findFilter, projection, limit, skip, sort } = filter;
      const timeLimit = DatabaseManagerUtils.getTimeLimit();
      const values = await config.collection
        .find(findFilter, { ...options, ...timeLimit })
        .project(projection)
        .sort(sort)
        .skip(skip || 0)
        .limit(limit || 0)
        .toArray();

      const logValues = values.map((item) => {
        return { id: item.id, name: item.name, status: item.status };
      });

      console.log(
        `\nDB Calling: ${config.serviceName} getAll with filter ${logFilter} returned ${
          values.length
        } objs: ${JSON.stringify(logValues, null, 2)}. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: values, time: new Date() - time };
    } catch (e) {
      console.log(
        `\nDB Calling Failed: ${config.serviceName} getAll with filter ${logFilter}. Error ${CommonUtils.getLogError(
          e
        )}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  getAllCount: async (config, filter, _ctx) => {
    const time = new Date();
    const logFilter = JSON.stringify(filter, CommonUtils.stringifyFilter, 2);

    try {
      const timeLimit = DatabaseManagerUtils.getTimeLimit();
      const count = await config.collection.countDocuments(filter.filter, { ...timeLimit });

      console.log(
        `\nDB Calling: ${
          config.serviceName
        } getAllCount with filter ${logFilter} returned ${count} objs count. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: count, time: new Date() - time };
    } catch (e) {
      console.log(
        `\nDB Calling Failed: ${
          config.serviceName
        } getAllCount with filter ${logFilter}. Error ${CommonUtils.getLogError(e)}. Finished in ${
          new Date() - time
        } ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * get the objects with these ids
   * options: Constants.ReadPrimary to see the writes just done, otherwise null
   */
  getAllByIDs: async (config, ids, projection, _ctx, options = null) => {
    return Public.getAll(config, { filter: { id: { $in: ids } }, projection }, _ctx, options);
  },

  /**
   * get all the objects that have a reference (a copy) of an object
   * ref: { fieldName } (user, students[], schedules[].location)
   * options: Constants.ReadPrimary to see the writes just done, otherwise null
   * return: { status, value } or { status, error: { message, error } }
   */
  getAllByReference: async (config, ref, refID, projection, _ctx, options = null) => {
    const fieldName = ref.fieldName.replaceAll('[]', '');
    return Public.getAll(config, { filter: { [`${fieldName}.id`]: refID }, projection }, _ctx, options);
  },

  /**
   * get one
   * config: { serviceName, collection }
   * options: Constants.ReadPrimary to see the writes just done, otherwise null (a secondary may answer)
   * return: { status, value } or { status, error: { message, error } }
   */
  getOne: async (config, objID, projection, _ctx, options = null) => {
    const time = new Date();

    try {
      const filter = { id: objID };
      const timeLimit = DatabaseManagerUtils.getTimeLimit();
      const value = await config.collection.findOne(filter, { projection, ...options, ...timeLimit });

      console.log(
        `\nDB Calling: ${config.serviceName} getOne for ${objID} returned: ${JSON.stringify(
          CommonUtils.protectData(value),
          null,
          2
        )}. Finished in ${new Date() - time} ms`
      );

      // not found
      if (!value) {
        return Utils.error(404, `Not found ${objID}`, time, _ctx);
      }

      return { status: 200, value: value, time: new Date() - time };
    } catch (e) {
      console.log(
        `\nDB Calling Failed: ${config.serviceName} getOne for ${objID}. Error ${CommonUtils.getLogError(
          e
        )}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * post
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  post: async (config, objInfo, _ctx) => {
    const time = new Date();

    objInfo.id = objInfo.id || CommonUtils.uuidc();
    objInfo.createdTimestamp = new Date().toISOString();
    objInfo.lastModifiedTimestamp = objInfo.createdTimestamp;
    objInfo.modifiedCount = 1;

    try {
      const timeLimit = DatabaseManagerUtils.getTimeLimit();
      const value = await config.collection.insertOne(objInfo, { ...timeLimit });

      console.log(
        `\nDB Calling: ${config.serviceName} post for ${JSON.stringify(
          CommonUtils.protectData(objInfo),
          null,
          2
        )} returned ${JSON.stringify(value, null, 2)}. Finished in ${new Date() - time} ms`
      );

      // not succeeded
      if (!value?.insertedId) {
        throw new Error(`Database insert failed`);
      }

      return { status: 201, value: objInfo, time: new Date() - time };
    } catch (e) {
      console.log(
        `\nDB Calling Failed: ${config.serviceName} post for ${JSON.stringify(
          CommonUtils.protectData(objInfo),
          null,
          2
        )}. Error ${CommonUtils.getLogError(e)}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * delete
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  delete: async (config, objID, projection, _ctx) => {
    const time = new Date();

    try {
      const filter = { id: objID };
      const timeLimit = DatabaseManagerUtils.getTimeLimit();
      const r = await config.collection.findOneAndDelete(filter, {
        projection,
        includeResultMetadata: true,
        ...timeLimit,
      });

      console.log(
        `\nDB Calling: ${config.serviceName} delete for ${objID} returned ${JSON.stringify(
          { ...r, value: CommonUtils.protectData(r.value) },
          null,
          2
        )}. Finished in ${new Date() - time} ms`
      );

      // not found
      if (r.lastErrorObject?.n === 0) {
        return Utils.error(404, `Not found ${objID}`, time, _ctx);
      }

      return { status: 200, value: r.value, time: new Date() - time };
    } catch (e) {
      console.log(
        `\nDB Calling Failed: ${config.serviceName} delete for ${objID}. Error ${CommonUtils.getLogError(
          e
        )}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * delete all the objects of a filter (never without a filter: that would empty the collection)
   * config: { serviceName, collection }
   * filter: { filter }
   * return: { status, value: deleted count } or { status, error: { message, error } }
   */
  deleteAll: async (config, filter, _ctx) => {
    const time = new Date();
    const logFilter = JSON.stringify(filter, CommonUtils.stringifyFilter, 2);

    const findFilter = filter?.filter;
    if (!findFilter || Object.keys(findFilter).length === 0) {
      return Utils.error(400, 'Delete all requires a filter', time, _ctx);
    }

    try {
      const timeLimit = DatabaseManagerUtils.getTimeLimit();
      const r = await config.collection.deleteMany(findFilter, { ...timeLimit });

      console.log(
        `\nDB Calling: ${config.serviceName} deleteAll with filter ${logFilter} deleted ${
          r.deletedCount
        } objs. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: r.deletedCount, time: new Date() - time };
    } catch (e) {
      console.log(
        `\nDB Calling Failed: ${config.serviceName} deleteAll with filter ${logFilter}. Error ${CommonUtils.getLogError(
          e
        )}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * put
   * config: { serviceName, collection, returnDocument? }
   * options: { filter? } the object is changed only when it also matches this filter (a conditional update, done in
   *   one database call: { status: 'pending' }); otherwise nothing is changed and the answer is 409 (or 404)
   * return: { status, value } or { status, error: { message, error } }
   */
  put: async (config, objID, objInfo, projection, _ctx, options = null) => {
    const time = new Date();
    const extraFilter = options?.filter;

    try {
      const returnDocument = config.returnDocument || 'after';
      const timeLimit = DatabaseManagerUtils.getTimeLimit();

      const r = await config.collection.findOneAndUpdate(
        { ...extraFilter, id: objID },
        {
          $set: { ...objInfo, lastModifiedTimestamp: new Date().toISOString() },
          $inc: { modifiedCount: 1 },
        },
        { returnDocument, includeResultMetadata: true, projection, ...timeLimit }
      );

      console.log(
        `\nDB Calling: ${config.serviceName} put for ${objID} with ${JSON.stringify(
          CommonUtils.protectData(objInfo)
        )} with filter ${JSON.stringify(extraFilter || {})} returned document ${returnDocument} ${JSON.stringify(
          { ...r, value: CommonUtils.protectData(r.value) },
          null,
          2
        )}. Finished in ${new Date() - time} ms`
      );

      // not found (or the filter is not matched)
      if (r.lastErrorObject?.n === 0) {
        return await Utils.notMatched(config, objID, extraFilter, time, _ctx);
      }

      return { status: 200, value: r.value, time: new Date() - time };
    } catch (e) {
      console.log(
        `\nDB Calling Failed: ${config.serviceName} put for ${objID}. Error ${CommonUtils.getLogError(
          e
        )}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * patch
   * config: { serviceName, collection }
   * patchInfo: { set, unset, add, remove, removeWhere }
   *   removeWhere: { <array field>: <condition> } removes the elements of an array that match a condition (internal
   *   only, never from a request: { schools: { roles: { $size: 0 } } } removes the memberships without roles)
   * return: { status, value } or { status, error: { message, error } }
   */
  patch: async (config, objID, patchInfo, projection, _ctx) => {
    const time = new Date();

    // create operation
    let bulkOperations = [];

    try {
      const filter = { id: objID };
      const timeLimit = DatabaseManagerUtils.getTimeLimit();

      // order is set, add, remove, removeWhere, unset

      // set
      if (Object.keys(patchInfo.set || {}).length) {
        bulkOperations.push({
          updateOne: {
            filter,
            update: {
              $set: { ...patchInfo.set },
            },
          },
        });
      }

      // add
      const pushOperations = DbOpsArrayUtils.getPushBulkOpsFromArray(filter, patchInfo.add, _ctx);
      bulkOperations = bulkOperations.concat(pushOperations);

      // remove
      const pullOperations = DbOpsArrayUtils.getPullBulkOpsFromArray(filter, patchInfo.remove, _ctx);
      bulkOperations = bulkOperations.concat(pullOperations);

      // remove the elements that match a condition
      if (Object.keys(patchInfo.removeWhere || {}).length) {
        bulkOperations.push({
          updateOne: { filter, update: { $pull: { ...patchInfo.removeWhere } } },
        });
      }

      // unset
      if (Array.isArray(patchInfo.unset) && patchInfo.unset.length) {
        // convert array to document
        let unset = {};
        patchInfo.unset.forEach((item) => (unset[item] = 1));
        bulkOperations.push({
          updateOne: { filter, update: { $unset: unset } },
        });
      }

      if (bulkOperations.length) {
        // do a bulk write operation followed by a get
        let r = await config.collection.bulkWrite(bulkOperations, { ordered: true, ...timeLimit });
        console.log(
          `\nDB Calling: ${config.serviceName} patch for ${objID} with ops: ${JSON.stringify(
            bulkOperations
          )} returned ${JSON.stringify(r, null, 2)}`
        );

        if (!r?.matchedCount) {
          return Utils.error(404, `Not found: patch ${objID}`, time, _ctx);
        }
      }

      // since get may not return latest object use findOneAndUpdate and add last operation for metadata (modified info)
      const changesUpdate = {
        $set: { lastModifiedTimestamp: new Date().toISOString() },
        $inc: { modifiedCount: 1 },
      };
      const r = await config.collection.findOneAndUpdate(filter, changesUpdate, {
        returnDocument: 'after',
        includeResultMetadata: true,
        projection,
        ...timeLimit,
      });

      console.log(
        `\nDB Calling: ${config.serviceName} patch for ${objID} with ${JSON.stringify(
          CommonUtils.protectData(changesUpdate)
        )} returned document after ${JSON.stringify(
          { ...r, value: CommonUtils.protectData(r.value) },
          null,
          2
        )}. Finished in ${new Date() - time} ms`
      );

      // not found
      if (r.lastErrorObject?.n === 0) {
        return Utils.error(404, `Not found: ${objID}`, time, _ctx);
      }

      return { status: 200, value: r.value, time: new Date() - time };
    } catch (e) {
      console.log(
        `\nDB Calling Failed: ${config.serviceName} patch for ${objID} with operation ${JSON.stringify(
          bulkOperations
        )}. Error ${CommonUtils.getLogError(e)}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * references add many
   * config: { serviceName, collection }
   * ref: { fieldName }
   * return: { status, value } or { status, error: { message, error } }
   */
  addManyReferences: async (config, targetsIDs, ref, objInfo, _ctx) => {
    const time = new Date();

    try {
      // examples of fieldName: user, schools[]
      // !!! this function does not work for inner arrays like this schedules[].location (only last field is ok to be array)
      // otherwise objinfo must include info about the inner arrays and filters must be constructed with elemMatch and same for arrayFilters

      const lastFieldIsArray = ref.fieldName.slice(-2) == '[]';

      // remove [] from last field
      const refFieldName = lastFieldIsArray ? ref.fieldName.slice(0, -2) : ref.fieldName;
      const { filterField, updateField } = Utils.getReferencesUpdateMany(refFieldName, objInfo, _ctx);

      const filters = { id: { $in: targetsIDs } };
      const arrayFilters = [];
      const timeLimit = DatabaseManagerUtils.getTimeLimit();

      let setObj = {};
      for (const key in objInfo) {
        setObj[`${updateField}.${key}`] = objInfo[key]; // schools.id: ..
      }

      // update obj
      let r = null;
      if (lastFieldIsArray) {
        // add to array
        r = await config.collection.updateMany(
          {
            ...filters,
            [filterField]: { $nin: [objInfo.id] }, // schools.id: ...
          },
          {
            $push: {
              [updateField]: objInfo, // schools: ...
            },
            $set: {
              lastModifiedTimestamp: new Date().toISOString(),
            },
            $inc: {
              modifiedCount: 1,
            },
          },
          {
            arrayFilters,
            ...timeLimit,
          }
        );
      } else {
        r = await config.collection.updateMany(
          {
            ...filters,
          },
          {
            $set: {
              ...setObj,
              lastModifiedTimestamp: new Date().toISOString(),
            },
            $inc: {
              modifiedCount: 1,
            },
          },
          {
            arrayFilters,
            ...timeLimit,
          }
        );
      }

      console.log(
        `\nDB Calling: ${config.serviceName} addManyReferences for field '${ref.fieldName}' for ids ${JSON.stringify(
          filters
        )} with info ${JSON.stringify(objInfo)} returned ${JSON.stringify(r, null, 2)}. Finished in ${
          new Date() - time
        } ms`
      );

      return { status: 200, value: r.modifiedCount, time: new Date() - time };
    } catch (e) {
      console.log(
        `\nDB Calling Failed: ${config.serviceName} addManyReferences for field '${
          ref.fieldName
        }' for ids ${JSON.stringify(targetsIDs)} with info ${JSON.stringify(objInfo)}. Error ${CommonUtils.getLogError(
          e
        )}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * references update many: the copies of an object are updated, only the copies that are older than it (their
   * modifiedCount is missing or smaller than the one of the object): a change that comes back through a cycle of
   * notifications, or a late notification of an older change, changes nothing
   * config: { serviceName, collection }
   * ref: { fieldName }
   * objInfo: the object (projected), with its modifiedCount
   * return: { status, value: updated count, ids: [ the ids of the updated objects ] } or { status, error }
   */
  updateManyReferences: async (config, ref, objInfo, _ctx) => {
    const time = new Date();

    try {
      // examples of fieldName:
      // user, schools[], schedules[].location, etc
      const { filterField, updateField, arrayFilters } = Utils.getReferencesUpdateMany(ref.fieldName, objInfo, _ctx);

      let setObj = {};
      for (const key in objInfo) {
        setObj[`${updateField}.${key}`] = objInfo[key]; // schedules.$[schedules].location.id: ...
      }

      // only the older copies: an object with a modifiedCount (without it: all its copies)
      const hasModifiedCount = typeof objInfo.modifiedCount === 'number';
      const filter = hasModifiedCount
        ? Utils.getFilterForObjectsToUpdate(ref.fieldName, objInfo)
        : { [filterField]: objInfo.id }; // schedules.location.id: ...
      const updateArrayFilters = hasModifiedCount
        ? Utils.getArrayFiltersForObjectsToUpdate(arrayFilters, objInfo)
        : arrayFilters;

      // the objects to update (on the primary: the copies written just before in the same request are seen)
      const timeLimit = DatabaseManagerUtils.getTimeLimit();
      const objects = await config.collection
        .find(filter, { ...Constants.ReadPrimary, ...timeLimit })
        .project({ _id: 0, id: 1 })
        .toArray();
      const ids = objects.map((item) => item.id);
      if (!ids.length) {
        console.log(
          `\nDB Calling: ${config.serviceName} updateManyReferences for '${ref.fieldName}' with info ${JSON.stringify(
            objInfo
          )}: no older copy. Finished in ${new Date() - time} ms`
        );
        return { status: 200, value: 0, ids: [], time: new Date() - time };
      }

      // update obj: the filter is checked again by the write itself, so a newer copy written meanwhile (another request)
      // is not overwritten
      const r = await config.collection.updateMany(
        { ...filter, id: { $in: ids } },
        {
          $set: {
            ...setObj,
            lastModifiedTimestamp: new Date().toISOString(),
          },
          $inc: {
            modifiedCount: 1,
          },
        },
        {
          arrayFilters: updateArrayFilters, // [{ schedules.location.id: '...', $or: [ schedules.location.modifiedCount... ] }]
          ...timeLimit,
          //explain: 'executionStats'
        }
      );

      console.log(
        `\nDB Calling: ${config.serviceName} updateManyReferences for '${ref.fieldName}' with info ${JSON.stringify(
          objInfo
        )} for ids ${JSON.stringify(ids)} returned ${JSON.stringify(r, null, 2)}. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: r.modifiedCount, ids, time: new Date() - time };
    } catch (e) {
      console.log(
        `\nDB Calling Failed: ${config.serviceName} updateManyReferences for '${
          ref.fieldName
        }' with info ${JSON.stringify(objInfo)}. Error ${CommonUtils.getLogError(e)}. Finished in ${
          new Date() - time
        } ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * references id update many: the copies of an object that got another id take its new id (the other fields of the
   * copies follow with updateManyReferences)
   * config: { serviceName, collection }
   * ref: { fieldName }
   * previousID: the id of the copies, objID: the new id
   * return: { status, value: updated count, ids: [ the ids of the updated objects ] } or { status, error }
   */
  updateManyReferencesID: async (config, ref, previousID, objID, _ctx) => {
    const time = new Date();

    try {
      // the copies with the previous id
      const { filterField, updateField, arrayFilters } = Utils.getReferencesUpdateMany(
        ref.fieldName,
        { id: previousID },
        _ctx
      );
      const timeLimit = DatabaseManagerUtils.getTimeLimit();
      const objects = await config.collection
        .find({ [filterField]: previousID }, { ...Constants.ReadPrimary, ...timeLimit })
        .project({ _id: 0, id: 1 })
        .toArray();
      const ids = objects.map((item) => item.id);
      if (!ids.length) {
        return { status: 200, value: 0, ids: [], time: new Date() - time };
      }

      // their new id (the write checks the previous id again: a copy changed meanwhile is not overwritten)
      const r = await config.collection.updateMany(
        { [filterField]: previousID, id: { $in: ids } },
        {
          $set: { [`${updateField}.id`]: objID, lastModifiedTimestamp: new Date().toISOString() },
          $inc: { modifiedCount: 1 },
        },
        { arrayFilters, ...timeLimit } // [{ students.id: previousID }]
      );

      console.log(
        `\nDB Calling: ${config.serviceName} updateManyReferencesID for '${ref.fieldName}' from ${previousID} to ${objID} for ids ${JSON.stringify(
          ids
        )} returned ${JSON.stringify(r, null, 2)}. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: r.modifiedCount, ids, time: new Date() - time };
    } catch (e) {
      console.log(
        `\nDB Calling Failed: ${config.serviceName} updateManyReferencesID for '${
          ref.fieldName
        }' from ${previousID} to ${objID}. Error ${CommonUtils.getLogError(e)}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * references delete many
   * config: { serviceName, collection }
   * ref: { fieldName }
   * options: { filter? } only the objects that also match this filter ({ id: { $nin: ids } }: all but these)
   * return: { status, value } or { status, error: { message, error } }
   */
  deleteManyReferences: async (config, ref, objInfo, _ctx, options = null) => {
    const time = new Date();
    const extraFilter = options?.filter;

    try {
      // examples of fieldName:
      // user, schools[], schedules[].location, etc

      const lastFieldIsArray = ref.fieldName.slice(-2) == '[]';

      // remove [] from last field
      const refFieldName = lastFieldIsArray ? ref.fieldName.slice(0, -2) : ref.fieldName;
      const { filterField, updateField, arrayFilters } = Utils.getReferencesUpdateMany(refFieldName, objInfo, _ctx);

      const timeLimit = DatabaseManagerUtils.getTimeLimit();
      let setObj = {};
      let setProps = {};
      for (const key in objInfo) {
        if (key === 'id') {
          continue;
        }
        const setKey = `${updateField}.${key}`; // schedules.$[schedules].location.name: ...
        setObj[setKey] = objInfo[key];
        setProps[setKey] = 1;
      }

      // update obj
      let r = null;
      if (lastFieldIsArray) {
        // remove from array
        r = await config.collection.updateMany(
          { ...extraFilter, [filterField]: objInfo.id }, // schedules.location.id: ...
          {
            $pull: {
              [updateField]: { id: objInfo.id }, //  schedules.$[schedules].location: ...
            },
            $set: {
              lastModifiedTimestamp: new Date().toISOString(),
            },
            $inc: {
              modifiedCount: 1,
            },
          },
          {
            arrayFilters, // [{ schedules.location.id: '...' }]
            ...timeLimit,
          }
        );
      } else {
        r = await config.collection.updateMany(
          { ...extraFilter, [filterField]: objInfo.id }, // schedules.location.id: ...
          {
            $unset: setProps, //  schedules.$[schedules].location.name ....
            $set: {
              lastModifiedTimestamp: new Date().toISOString(),
            },
            $inc: {
              modifiedCount: 1,
            },
          },
          {
            arrayFilters, // [{ schedules.location.id: '...' }]
            ...timeLimit,
          }
        );
      }

      console.log(
        `\nDB Calling: ${config.serviceName} deleteManyReferences for '${ref.fieldName}' with info ${JSON.stringify(
          objInfo
        )} and filter ${JSON.stringify(extraFilter || {})} returned ${JSON.stringify(r, null, 2)}. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: r.modifiedCount, time: new Date() - time };
    } catch (e) {
      console.log(
        `\nDB Calling Failed: ${config.serviceName} deleteManyReferences for '${
          ref.fieldName
        }' with info ${JSON.stringify(objInfo)}. Error ${CommonUtils.getLogError(e)}. Finished in ${
          new Date() - time
        } ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },
};

module.exports = { ...Public };
