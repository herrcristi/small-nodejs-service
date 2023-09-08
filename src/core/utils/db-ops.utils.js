/**
 * Database operation utils
 */
const CommonUtils = require('./common.utils');

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
   * stringify a regexp
   */
  stringifyFilter: (key, value) => {
    return value instanceof RegExp ? value.toString() : value;
  },
};

const Private = {
  /**
   * convert path update to bulk write operations
   */
  convertPatchUpdateToBulkOps: (filter, patchOperation, _ctx) => {
    let bulkOperations = [];
    for (const op in patchOperation) {
      bulkOperations.push({
        updateOne: {
          filter,
          update: { [op]: patchOperation[op] },
        },
      });
    }

    return bulkOperations;
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
        `DB Calling: ${config.serviceName} getAll with filter ${JSON.stringify(
          filter,
          Utils.stringifyFilter
        )} returned ${values.length} objs: ${JSON.stringify(logValues)}. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: values, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} getAll with filter ${JSON.stringify(
          filter,
          Utils.stringifyFilter
        )}. Error ${e.stack ? e.stack : e}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  getAllCount: async (config, filter, _ctx) => {
    const time = new Date();

    try {
      const count = await config.collection.count(filter.filter);

      console.log(
        `DB Calling: ${config.serviceName} getAllCount with filter ${JSON.stringify(
          filter,
          Utils.stringifyFilter
        )} returned ${count} objs count. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: count, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} getAllCount with filter ${JSON.stringify(
          filter,
          Utils.stringifyFilter
        )}. Error ${e.stack ? e.stack : e}. Finished in ${new Date() - time} ms`
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
        `DB Calling: ${config.serviceName} getOne for ${objID} returned ${JSON.stringify(value)}. Finished in ${
          new Date() - time
        } ms`
      );

      // not found
      if (!value) {
        return Utils.error(404, `Not found ${objID}`, time, _ctx);
      }

      return { status: 200, value: value, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} getOne for  ${objID}. Error ${e.stack ? e.stack : e}. Finished in ${
          new Date() - time
        } ms`
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
    objInfo.createdTimestamp = new Date();
    objInfo.lastModifiedTimestamp = objInfo.createdTimestamp;

    try {
      const value = await config.collection.insertOne(objInfo);

      console.log(
        `DB Calling: ${config.serviceName} post for ${objInfo.id} returned ${JSON.stringify(value)}. Finished in ${
          new Date() - time
        } ms`
      );

      // not succeeded
      if (!value.insertedId) {
        return Utils.error(500, `Failed to post ${JSON.stringify(objInfo)}`, time, _ctx);
      }

      return { status: 201, value: objInfo, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} post for ${JSON.stringify(objInfo)}. Error ${
          e.stack ? e.stack : e
        }. Finished in ${new Date() - time} ms`
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
        `DB Calling: ${config.serviceName} delete for ${objID} returned ${JSON.stringify(r)}. Finished in ${
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
        `DB Calling Failed: ${config.serviceName} delete for ${objID}. Error ${e.stack ? e.stack : e}. Finished in ${
          new Date() - time
        } ms`
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
        { $set: { ...objInfo, lastModifiedTimestamp: new Date() } },
        { returnDocument: 'after', includeResultMetadata: true, projection }
      );

      console.log(
        `DB Calling: ${config.serviceName} put for ${objID} returned ${JSON.stringify(r)}. Finished in ${
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
        `DB Calling Failed: ${config.serviceName} put for ${objID}. Error ${e.stack ? e.stack : e}. Finished in ${
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
    let updateOperation = {};

    try {
      const filter = { id: objID };

      // order is set, add, remove, unset
      // set
      updateOperation.$set = patchInfo.set || {};
      updateOperation.$set.lastModifiedTimestamp = new Date();

      // add
      let addKeys = Object.keys(patchInfo.add || {});
      if (addKeys.length) {
        updateOperation.$addToSet = {};
        for (const field of addKeys) {
          updateOperation.$addToSet[field] = { $each: patchInfo.add[field] };
        }
      }

      // remove
      let removeKeys = Object.keys(patchInfo.remove || {});
      if (removeKeys.length) {
        updateOperation.$pull = {};
        for (const field of removeKeys) {
          updateOperation.$pull[field] = { $in: patchInfo.remove[field] };
        }
      }

      // unset
      if (Array.isArray(patchInfo.unset) && patchInfo.unset.length) {
        // convert array to document
        let unset = {};
        patchInfo.unset.forEach((item) => (unset[item] = 1));
        updateOperation.$unset = unset;
      }

      // has conflicting operations when same field is used in multiple operators
      let r = null;
      if (CommonUtils.hasCommonFields(Object.values(updateOperation))) {
        // do a bulk write operation followed by a get
        updateOperation = Private.convertPatchUpdateToBulkOps(filter, updateOperation, _ctx);
        r = await config.collection.bulkWrite(updateOperation, { ordered: false });

        if (r.matchedCount) {
          r.value = await config.collection.findOne(filter, { projection });
        }

        // not found
        if (!r.value) {
          r.lastErrorObject = { n: 0 };
        }
      } else {
        // normal op
        r = await config.collection.findOneAndUpdate(filter, updateOperation, {
          returnDocument: 'after',
          includeResultMetadata: true,
          projection,
        });
      }

      console.log(
        `DB Calling: ${config.serviceName} patch for ${objID} with ops: ${JSON.stringify(
          updateOperation
        )} returned ${JSON.stringify(r)}. Finished in ${new Date() - time} ms`
      );

      // not found
      if (r.lastErrorObject?.n === 0) {
        return Utils.error(404, `Not found ${objID}`, time, _ctx);
      }

      return { status: 200, value: r.value, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} patch for ${objID} with operation ${JSON.stringify(
          updateOperation
        )}. Error ${e.stack ? e.stack : e}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * references update many
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  updateManyReferences: async (config, fieldName, objInfo, _ctx) => {
    const time = new Date();

    try {
      let filterField = fieldName ? `${fieldName}.id` : `id`;
      // if array set fieldName.$.field = objInfo.field
      // TODO isArray
      fieldName = /* isArray */ fieldName ? `${fieldName}.$` : fieldName;
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
        `DB Calling: ${config.serviceName} updateManyReferences for ${fieldName} with info ${JSON.stringify(
          objInfo
        )} returned ${JSON.stringify(r)}. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: r.modifiedCount, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} updateManyReferences for ${fieldName} with info ${JSON.stringify(
          objInfo
        )}. Error ${e.stack ? e.stack : e}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },

  /**
   * references delete many
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  deleteManyReferences: async (config, fieldName, objInfo, _ctx) => {
    const time = new Date();

    try {
      let filterField = fieldName ? `${fieldName}.id` : `id`;
      let isArray = fieldName ? true : false; // TODO isArray

      let setObj = {};
      for (const key in objInfo) {
        const setKey = fieldName ? `${fieldName}.${key}` : key;
        setObj[setKey] = objInfo[key];
      }

      // update obj
      let r = null;
      if (isArray) {
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
            $unset: {
              ...Object.keys(setObj),
            },
            $set: {
              lastModifiedTimestamp: new Date(),
            },
          }
        );
      }

      console.log(
        `DB Calling: ${config.serviceName} deleteManyReferences for ${fieldName} with info ${JSON.stringify(
          objInfo
        )} returned ${JSON.stringify(r)}. Finished in ${new Date() - time} ms`
      );

      return { status: 200, value: r.deletedCount, time: new Date() - time };
    } catch (e) {
      console.log(
        `DB Calling Failed: ${config.serviceName} deleteManyReferences for ${fieldName} with info ${JSON.stringify(
          objInfo
        )}. Error ${e.stack ? e.stack : e}. Finished in ${new Date() - time} ms`
      );
      return Utils.exception(e, time, _ctx);
    }
  },
};

module.exports = { ...Public };
