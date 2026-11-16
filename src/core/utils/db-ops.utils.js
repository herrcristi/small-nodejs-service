/**
 * Database operation utils
 */
const CommonUtils = require('./common.utils.js');
const DbOpsArrayUtils = require('./db-ops.array.utils.js');

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

  exception: (e, time, _ctx) => {
    return {
      status: 500,
      error: { message: e.message || e, error: e },
      time: new Date() - time /*milliseconds*/,
    };
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
};

const Public = {
  /**
   * get all
   * config: { serviceName, collection }
   * filter: { filter, projection, limit, skip, sort }
   * return: { status, value } or { status, error: { message, error } }
   */
  getAll: async (config, filter, _ctx) => {
    const time = new Date();
    const logFilter = JSON.stringify(filter, CommonUtils.stringifyFilter, 2);

    try {
      const { filter: findFilter, projection, limit, skip, sort } = filter;
      const values = await config.collection
        .find(findFilter)
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
      const count = await config.collection.countDocuments(filter.filter);

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

  getAllByIDs: async (config, ids, projection, _ctx) => {
    return Public.getAll(config, { filter: { id: { $in: ids } }, projection }, _ctx);
  },

  /**
   * get one
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  getOne: async (config, objID, projection, _ctx) => {
    const time = new Date();

    try {
      const filter = { id: objID };
      const value = await config.collection.findOne(filter, { projection });

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
      const value = await config.collection.insertOne(objInfo);

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
      const r = await config.collection.findOneAndDelete(filter, { projection, includeResultMetadata: true });

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
   * put
   * config: { serviceName, collection, returnDocument? }
   * return: { status, value } or { status, error: { message, error } }
   */
  put: async (config, objID, objInfo, projection, _ctx) => {
    const time = new Date();

    try {
      const returnDocument = config.returnDocument || 'after';

      const r = await config.collection.findOneAndUpdate(
        { id: objID },
        {
          $set: { ...objInfo, lastModifiedTimestamp: new Date().toISOString() },
          $inc: { modifiedCount: 1 },
        },
        { returnDocument, includeResultMetadata: true, projection }
      );

      console.log(
        `\nDB Calling: ${config.serviceName} put for ${objID} with ${JSON.stringify(
          CommonUtils.protectData(objInfo)
        )} returned document ${returnDocument} ${JSON.stringify(
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
   * patchInfo: { set, unset, add, remove }
   * return: { status, value } or { status, error: { message, error } }
   */
  patch: async (config, objID, patchInfo, projection, _ctx) => {
    const time = new Date();

    // create operation
    let bulkOperations = [];

    try {
      const filter = { id: objID };

      // order is set, add, remove, unset

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
      bulkOperations = bulkOperations.concat(DbOpsArrayUtils.getPushBulkOpsFromArray(filter, patchInfo.add, _ctx));

      // remove
      bulkOperations = bulkOperations.concat(DbOpsArrayUtils.getPullBulkOpsFromArray(filter, patchInfo.remove, _ctx));

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
        let r = await config.collection.bulkWrite(bulkOperations, { ordered: true });
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
   * references update many
   * config: { serviceName, collection }
   * ref: { fieldName }
   * return: { status, value } or { status, error: { message, error } }
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

      // update obj
      const r = await config.collection.updateMany(
        { [filterField]: objInfo.id }, // schedules.location.id: ...
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
          arrayFilters, // [{ schedules.location.id: '...' }]
          //explain: 'executionStats'
        }
      );

      console.log(
        `\nDB Calling: ${config.serviceName} updateManyReferences for '${ref.fieldName}' with info ${JSON.stringify(
          objInfo
        )} returned ${JSON.stringify(r, null, 2)}. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: r.modifiedCount, time: new Date() - time };
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
   * references delete many
   * config: { serviceName, collection }
   * ref: { fieldName }
   * return: { status, value } or { status, error: { message, error } }
   */
  deleteManyReferences: async (config, ref, objInfo, _ctx) => {
    const time = new Date();

    try {
      // examples of fieldName:
      // user, schools[], schedules[].location, etc

      const lastFieldIsArray = ref.fieldName.slice(-2) == '[]';

      // remove [] from last field
      const refFieldName = lastFieldIsArray ? ref.fieldName.slice(0, -2) : ref.fieldName;
      const { filterField, updateField, arrayFilters } = Utils.getReferencesUpdateMany(refFieldName, objInfo, _ctx);

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
          { [filterField]: objInfo.id }, // schedules.location.id: ...
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
          }
        );
      } else {
        r = await config.collection.updateMany(
          { [filterField]: objInfo.id }, // schedules.location.id: ...
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
          }
        );
      }

      console.log(
        `\nDB Calling: ${config.serviceName} deleteManyReferences for '${ref.fieldName}' with info ${JSON.stringify(
          objInfo
        )} returned ${JSON.stringify(r, null, 2)}. Finished in ${new Date() - time} ms`
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
