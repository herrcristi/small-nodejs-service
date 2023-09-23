/**
 * Database operation utils
 */
const _ = require('lodash');
const CommonUtils = require('./common.utils');

const Private = {
  /**
   * extract from object
   * all non-array props and build filters and array filters
   * and all array props
   */
  getObjectFilters: (obj, workset, _ctx) => {
    let arraysProps = [];
    let nonArrayProps = {};
    let currentOpFilters = {}; // for $pull, $push
    let currentArrayFilters = {}; // for arrayFilters
    let hasIDProp = false;

    // convert to patch to catch inner objects too
    let patchObj = CommonUtils.obj2patch(obj);

    // if the obj has no arrays the currentOpFilters will be used
    // otherwise conditions will be put in currentArrayFilters to be used when called for that arrays
    for (const prop of Object.keys(patchObj)) {
      if (Array.isArray(patchObj[prop])) {
        arraysProps.push({
          prop: prop,
          array: patchObj[prop],
        });
        continue;
      }

      // keep all props which are not arrays
      nonArrayProps[prop] = patchObj[prop];

      // if prop id exists only this will matter for filtering
      if (prop === 'id') {
        hasIDProp = true;
        currentOpFilters = {};
        currentArrayFilters = {};
      } else {
        if (hasIDProp) {
          continue;
        }
      }

      currentOpFilters[prop] = patchObj[prop];
      currentArrayFilters[`${workset.field}.${prop}`] = patchObj[prop];
    }

    // array
    let hasCurrentArrayFilters = Object.keys(currentArrayFilters).length > 0;

    // array
    let arrayFilters = [...workset.arrayFilters];
    if (hasCurrentArrayFilters) {
      arrayFilters.push(currentArrayFilters);
    }

    let arrayPath = `${workset.arrayPath}.$[${hasCurrentArrayFilters ? workset.field : ''}]`;

    // non array props are patched
    let patchNonArrayProps = {};
    for (const prop in nonArrayProps) {
      // filter 'id' to avoid patch if only 'id' is set
      if (prop !== 'id') {
        patchNonArrayProps[`${arrayPath}.${prop}`] = nonArrayProps[prop];
      }
    }

    // path filters for array
    // traverse all fields
    let paths = workset.path.split('.');

    let pathFilters = _.cloneDeep(workset.pathFilters);
    let fieldPathFilter = pathFilters;
    for (let i = 0; i < paths.length - 1 && fieldPathFilter[paths[i]]; ++i) {
      fieldPathFilter = fieldPathFilter[paths[i]]['$elemMatch'];
    }
    fieldPathFilter[workset.field] = { $elemMatch: currentOpFilters };

    // path filters for adding entire element - checking if current element not exists
    let pathFiltersNot = _.cloneDeep(workset.pathFilters);
    let fieldPathFilterNot = pathFiltersNot;
    for (let i = 0; i < paths.length - 1 && fieldPathFilterNot[paths[i]]; ++i) {
      fieldPathFilterNot = fieldPathFilterNot[paths[i]]['$elemMatch'];
    }
    if (hasCurrentArrayFilters) {
      fieldPathFilterNot[workset.field] = { $not: { $elemMatch: currentOpFilters } };
    }

    return {
      opFilters: currentOpFilters,
      pathFiltersNot,
      pathFilters,
      fieldPathFilter,

      patchNonArrayProps,

      hasArrays: arraysProps.length > 0,
      arraysProps,
      arrayPath,
      arrayFilters,
    };
  },

  /**
   * convert a remove array to bulk ops
   *
   * ex:  tags: [ 'tag1', 'tag2']             removes tag1 and tag2 from array tag
   *      schools: [ { id: 'schooldid1' } ]   removes entire object with id schooldid1 from array schools
   *      schools: [ { id: 'schooldid1', roles: ['role1'] } ]  removes role1 from array roles for schoolid1 from array schools
   *
   * more ex: in test file src/core/test/db-ops.utils/db-ops.array.utils.getPullBulkOpsFromArray.test.js
   * for objects that have unique id is this can be used for filter (no need for other fields)
   */
  getPullBulkOpsFromArray: (bulkOps, workset, _ctx) => {
    // values must be an array
    if (!Array.isArray(workset.values)) {
      return;
    }

    let objects = workset.values.filter((item) => typeof item === 'object');
    let nonObjects = workset.values.filter((item) => typeof item !== 'object');

    // for values non objects just remove those from respective fields
    if (nonObjects.length) {
      bulkOps.push({
        updateMany: {
          filter: workset.mainFilter,
          update: { $pull: { [workset.arrayPath]: { $in: nonObjects } } },
          arrayFilters: workset.arrayFilters,
        },
      });
    }

    if (!objects.length) {
      return;
    }

    // treat every object case
    for (const obj of objects) {
      const f = Private.getObjectFilters(obj, workset, _ctx);

      if (!f.hasArrays) {
        bulkOps.push({
          updateMany: {
            filter: workset.mainFilter,
            update: { $pull: { [workset.arrayPath]: f.opFilters } },
            arrayFilters: workset.arrayFilters,
          },
        });
        continue;
      }

      // recursive apply the same for the arrays
      for (const arr of f.arraysProps) {
        const newworkset = {
          mainFilter: workset.mainFilter,
          field: arr.prop,
          values: arr.array,
          path: `${workset.path}.${arr.prop}`,
          pathFilters: f.pathFilters,
          arrayPath: `${f.arrayPath}.${arr.prop}`,
          arrayFilters: f.arrayFilters,
        };
        Private.getPullBulkOpsFromArray(bulkOps, newworkset, _ctx);
      }
    }
  },

  /**
   * convert and add info arrays to bulk ops
   * ex:  {
   *  tags: [ 'tag1', 'tag2'],                    add tag1 and tag2 to array tags
   *  comments: [ { id: 'id1', comment: 'x' } ],  add object with id id1 and comment x to array comments if not already exists (with that id)
   *  schools: [ { id: 'schooldid1', roles: ['role1'] } ]
   *      if school with id schooldid1 does not exists then it is added
   *      and add role1 to array roles for schoolid1 in array schools
   * }
   *
   * more ex: in test file src/core/test/db-ops.utils/db-ops.array.utils.getPushBulkOpsFromArray.test.js
   */
  getPushBulkOpsFromArray: (bulkOps, workset, _ctx) => {
    if (!Array.isArray(workset.values)) {
      return;
    }

    let objects = workset.values.filter((item) => typeof item === 'object');
    let nonObjects = workset.values.filter((item) => typeof item !== 'object');

    // for values non objects just add those to respective fields
    if (nonObjects.length) {
      bulkOps.push({
        updateMany: {
          filter: workset.mainFilter,
          update: { $addToSet: { [workset.arrayPath]: { $each: nonObjects } } },
          arrayFilters: workset.arrayFilters,
        },
      });
    }

    if (!objects.length) {
      return;
    }

    // treat every object case
    for (let obj of objects) {
      const f = Private.getObjectFilters(obj, workset, _ctx);

      // add entire object if does not exists
      // (except if current object has only arrays and no other members to filter)
      if (Object.keys(f.opFilters).length) {
        bulkOps.push({
          updateMany: {
            filter: { $and: [workset.mainFilter, f.pathFiltersNot] },
            update: { $push: { [workset.arrayPath]: obj } },
            arrayFilters: workset.arrayFilters,
          },
        });
      }

      // set entire nonarray props
      if (Object.keys(f.patchNonArrayProps).length) {
        bulkOps.push({
          updateMany: {
            filter: workset.mainFilter,
            update: { $set: f.patchNonArrayProps },
            arrayFilters: f.arrayFilters,
          },
        });
      }

      if (!f.hasArrays) {
        continue;
      }

      // recursive apply the same for the arrays
      for (const arr of f.arraysProps) {
        const newworkset = {
          mainFilter: workset.mainFilter,
          field: arr.prop,
          values: arr.array,
          path: `${workset.path}.${arr.prop}`,
          pathFilters: f.pathFilters,
          arrayPath: `${f.arrayPath}.${arr.prop}`,
          arrayFilters: f.arrayFilters,
        };
        Private.getPushBulkOpsFromArray(bulkOps, newworkset, _ctx);
      }
    }
  },
};

const Public = {
  /**
   * convert a remove info arrays to bulk ops
   *
   * ex:  {
   *  tags: [ 'tag1', 'tag2'],          removes tag1 and tag2 from array tags
   *  comments: [ { id: 'id1' } ],      removes entire object with id id1 from array comments
   *  schools: [ { id: 'schooldid1', roles: ['role1'] } ]  removes role1 only from array roles for schoolid1 in array schools
   * }
   *
   * more ex: in test file src/core/test/db-ops.utils/db-ops.array.utils.getPullBulkOpsFromArray.test.js
   * for objects that have unique id is this can be used for filter (no need for other fields)
   */
  getPullBulkOpsFromArray: (mainFilter, removeInfo, _ctx) => {
    let bulkOps = [];

    for (const field in removeInfo) {
      const pathFilters = {};

      const workset = {
        mainFilter,
        field,
        values: removeInfo[field],
        path: field,
        pathFilters: pathFilters,
        arrayPath: field,
        arrayFilters: [],
      };

      Private.getPullBulkOpsFromArray(bulkOps, workset, _ctx);
    }

    return bulkOps;
  },

  /**
   * convert and add info arrays to bulk ops
   *
   * ex:  {
   *  tags: [ 'tag1', 'tag2'],                    add tag1 and tag2 to array tags
   *  comments: [ { id: 'id1', comment: 'x' } ],  add object with id id1 and comment x to array comments if not already exists (with that id)
   *  schools: [ { id: 'schooldid1', roles: ['role1'] } ]
   *      if school with id schooldid1 does not exists then it is added
   *      and add role1 to array roles for schoolid1 in array schools
   * }
   *
   * more ex: in test file src/core/test/db-ops.utils/db-ops.array.utils.getPushBulkOpsFromArray.test.js
   */
  getPushBulkOpsFromArray: (mainFilter, addInfo, _ctx) => {
    let bulkOps = [];

    for (const field in addInfo) {
      const pathFilters = {};

      const workset = {
        mainFilter,
        field,
        values: addInfo[field],
        path: field,
        pathFilters: pathFilters,
        arrayPath: field,
        arrayFilters: [],
      };

      Private.getPushBulkOpsFromArray(bulkOps, workset, _ctx);
    }

    return bulkOps;
  },
};

module.exports = { ...Public };
