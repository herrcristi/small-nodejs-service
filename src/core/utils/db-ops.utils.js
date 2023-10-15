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
        `DB Calling: ${config.serviceName} getAll with filter ${logFilter} returned ${
          values.length
        } objs: ${JSON.stringify(logValues, null, 2)}. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: values, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} getAll with filter ${logFilter}. Error ${CommonUtils.getLogError(
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
      const count = await config.collection.count(filter.filter);

      console.log(
        `DB Calling: ${
          config.serviceName
        } getAllCount with filter ${logFilter} returned ${count} objs count. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: count, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} getAllCount with filter ${logFilter}. Error ${CommonUtils.getLogError(
          e
        )}. Finished in ${new Date() - time} ms`
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
        `DB Calling: ${config.serviceName} getOne for ${objID} returned: ${JSON.stringify(
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
        `DB Calling Failed: ${config.serviceName} getOne for ${objID}. Error ${CommonUtils.getLogError(
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

    try {
      const value = await config.collection.insertOne(objInfo);

      console.log(
        `DB Calling: ${config.serviceName} post for ${JSON.stringify(
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
        `DB Calling Failed: ${config.serviceName} post for ${JSON.stringify(
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
        `DB Calling: ${config.serviceName} delete for ${objID} returned ${JSON.stringify(
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
        `DB Calling Failed: ${config.serviceName} delete for ${objID}. Error ${CommonUtils.getLogError(
          e
        )}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * put
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  put: async (config, objID, objInfo, projection, _ctx) => {
    const time = new Date();

    try {
      const r = await config.collection.findOneAndUpdate(
        { id: objID },
        { $set: { ...objInfo, lastModifiedTimestamp: new Date().toISOString() } },
        { returnDocument: 'after', includeResultMetadata: true, projection }
      );

      console.log(
        `DB Calling: ${config.serviceName} put for ${objID} with ${JSON.stringify(
          CommonUtils.protectData(objInfo)
        )} returned ${JSON.stringify({ ...r, value: CommonUtils.protectData(r.value) }, null, 2)}. Finished in ${
          new Date() - time
        } ms`
      );

      // not found
      if (r.lastErrorObject?.n === 0) {
        return Utils.error(404, `Not found ${objID}`, time, _ctx);
      }

      return { status: 200, value: r.value, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} put for ${objID}. Error ${CommonUtils.getLogError(e)}. Finished in ${
          new Date() - time
        } ms`
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
      bulkOperations.push({
        updateOne: {
          filter,
          update: {
            $set: {
              ...(patchInfo.set || {}),
              lastModifiedTimestamp: new Date().toISOString(),
            },
          },
        },
      });

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

      // do a bulk write operation followed by a get
      let r = await config.collection.bulkWrite(bulkOperations, { ordered: true });
      console.log(
        `DB Calling: ${config.serviceName} patch for ${objID} with ops: ${JSON.stringify(
          bulkOperations
        )} returned ${JSON.stringify(r, null, 2)}. Finished in ${new Date() - time} ms`
      );

      if (!r?.matchedCount) {
        return Utils.error(404, `Not found: patch ${objID}`, time, _ctx);
      }

      // get
      let value = await config.collection.findOne(filter, { projection });
      if (!value) {
        return Utils.error(404, `Not found: get ${objID}`, time, _ctx);
      }

      return { status: 200, value, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} patch for ${objID} with operation ${JSON.stringify(
          bulkOperations
        )}. Error ${CommonUtils.getLogError(e)}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * references update many
   * config: { serviceName, collection }
   * ref: { fieldName, isArray }
   * return: { status, value } or { status, error: { message, error } }
   */
  updateManyReferences: async (config, ref, objInfo, _ctx) => {
    const time = new Date();

    try {
      const filterField = ref.fieldName ? `${ref.fieldName}.id` : `id`;
      // if array set fieldName.$.field = objInfo.field
      const fieldName = ref.isArray ? `${ref.fieldName}.$` : ref.fieldName;
      let setObj = {};
      for (const key in objInfo) {
        const setKey = fieldName ? `${fieldName}.${key}` : key;
        setObj[setKey] = objInfo[key];
      }

      // update obj
      const r = await config.collection.updateMany(
        { [filterField]: objInfo.id },
        {
          $set: {
            ...setObj,
            lastModifiedTimestamp: new Date(),
          },
        }
        // {explain: 'executionStats'}
      );

      console.log(
        `DB Calling: ${config.serviceName} updateManyReferences for '${ref.fieldName}' with info ${JSON.stringify(
          objInfo
        )} returned ${JSON.stringify(r, null, 2)}. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: r.modifiedCount, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} updateManyReferences for '${
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
   * ref: { fieldName, isArray }
   * return: { status, value } or { status, error: { message, error } }
   */
  deleteManyReferences: async (config, ref, objInfo, _ctx) => {
    const time = new Date();

    try {
      const filterField = ref.fieldName ? `${ref.fieldName}.id` : `id`;
      const fieldName = ref.fieldName;

      let setObj = {};
      let setProps = {};
      for (const key in objInfo) {
        const setKey = fieldName ? `${fieldName}.${key}` : key;
        if (key !== 'id') {
          setObj[setKey] = objInfo[key];
          setProps[setKey] = 1;
        }
      }

      // update obj
      let r = null;
      if (ref.isArray) {
        // remove from array
        r = await config.collection.updateMany(
          { [filterField]: objInfo.id },
          {
            $pull: {
              [fieldName]: { id: objInfo.id },
            },
            $set: {
              lastModifiedTimestamp: new Date(),
            },
          }
        );
      } else {
        r = await config.collection.updateMany(
          { [filterField]: objInfo.id },
          {
            $unset: setProps,
            $set: {
              lastModifiedTimestamp: new Date(),
            },
          }
        );
      }

      console.log(
        `DB Calling: ${config.serviceName} deleteManyReferences for '${ref.fieldName}' with info ${JSON.stringify(
          objInfo
        )} returned ${JSON.stringify(r, null, 2)}. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: r.modifiedCount, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} deleteManyReferences for '${
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
