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
    // treat put like a patch
    return await Public.patch(config, objID, { set: objInfo }, projection, _ctx);
  },

  /**
   * patch
   * config: { serviceName, collection }
   * patchInfo: { set, unset, add, remove }
   * return: { status, value } or { status, error: { message, error } }
   */
  patch: async (config, objID, patchInfo, projection, _ctx) => {
    const time = new Date();

    try {
      const filter = { id: objID };

      const updateOperations = [];
      // set
      if (Object.keys(patchInfo.set || {})) {
        updateOperations.push({
          updateOne: {
            filter,
            update: { $set: patchInfo.set },
          },
        });
      }
      // unset
      if (Array.isArray(patchInfo.unset) && patchInfo.unset.length) {
        updateOperations.push({
          updateOne: {
            filter,
            update: { $unset: patchInfo.unset },
          },
        });
      }
      // add
      for (let field in Object.keys(patchInfo.add || {})) {
        updateOperations.push({
          updateOne: {
            filter,
            update: { $addToSet: { [field]: { $each: patchInfo.add[field] } } },
          },
        });
      }
      // remove
      for (let field in Object.keys(patchInfo.remove || {})) {
        updateOperations.push({
          updateOne: {
            filter,
            update: { $pull: { [field]: { $each: patchInfo.remove[field] } } },
          },
        });
      }

      // set lastModified timestamp
      if (updateOperations.length) {
        updateOperations.push({
          updateOne: {
            filter,
            update: { $set: { lastModifiedTimestamp: new Date() } },
          },
        });

        const r = await config.collection.bulkWrite(updateOperations, { ordered: false });
        console.log(
          `DB Calling: ${config.serviceName} patch for ${objID} with ops: ${JSON.stringify(
            updateOperations,
            null,
            2
          )} returned ${JSON.stringify(r)}. Finished in ${new Date() - time} ms`
        );

        if (!r.matchedCount) {
          return Utils.error(404, `Not found ${objID}`, time, _ctx);
        }
      }

      // const r = await config.collection.findOneAndUpdate(filter, patchInfo.set, { projection, includeResultMetadata: true });

      // get
      const value = await config.collection.findOne(filter, { projection });

      console.log(
        `DB Calling: ${config.serviceName} patch.getOne for ${objID} returned ${JSON.stringify(value)}. Finished in ${
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
        `DB Calling Failed: ${config.serviceName} patch for ${objID}. Error ${e.stack ? e.stack : e}. Finished in ${
          new Date() - time
        } ms`
      );
      return Utils.exception(e, time, _ctx);
    }

    // 200, 404
    return Utils.error(500, 'Not implemented', time, _ctx);
  },

  /**
   * references update many
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  updateManyReferences: async (config, fieldName, objInfo, _ctx) => {
    const time = new Date();
    //set.lastModifiedTimestamp = new Date();

    let filterField = fieldName ? `${fieldName}.id` : `id`;
    // filterField === objInfo.id -> set fieldName.field = objInfo.field

    // 200, 404
    return Utils.error(500, 'Not implemented', time, _ctx);
  },

  /**
   * references delete many
   * config: { serviceName, collection }
   * return: { status, value } or { status, error: { message, error } }
   */
  deleteManyReferences: async (config, fieldName, objInfo, _ctx) => {
    const time = new Date();
    //set.lastModifiedTimestamp = new Date();

    let filterField = fieldName ? `${fieldName}.id` : `id`;
    // filterField === objInfo.id -> set fieldName.field = objInfo.field

    // 200, 404
    return Utils.error(500, 'Not implemented', time, _ctx);
  },
};

module.exports = { ...Public };
