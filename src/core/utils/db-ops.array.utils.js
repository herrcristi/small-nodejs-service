/**
 * Database operation utils
 */
const CommonUtils = require('./common.utils');

const Private = {
  /**
   * convert a remove array to bulk ops
   *
   * ex:  tags: [ 'tag1', 'tag2']             removes tag1 and tag2 from array tag
   *      schools: [ { id: 'schooldid1' } ]   removes entire object with id schooldid1 from array schools
   *      schools: [ { id: 'schooldid1', roles: ['role1'] } ]  removes role1 from array roles for schoolid1 from array schools
   *
   * more ex: in test file src/core/test/db-ops.utils/db-ops.array.utils.getPullBulkOpsFromArray.test.js
   */
  getPullBulkOpsFromArray: (bulkOps, filter, allFields, currentField, values, arrayFilters, _ctx) => {
    // values must be an array
    if (!Array.isArray(values)) {
      return;
    }

    let objects = values.filter((item) => typeof item === 'object');
    let nonObjects = values.filter((item) => typeof item !== 'object');

    // for values non objects just remove those from respective fields
    if (nonObjects.length) {
      let op = {
        updateMany: {
          filter,
          update: { $pull: { [allFields]: { $in: values } } },
        },
      };
      if (arrayFilters?.length) {
        op.updateMany.arrayFilters = arrayFilters;
      }
      bulkOps.push(op);
    }

    if (objects.length) {
      // treat every object case
      for (let obj of objects) {
        let currentArrayFilters = {};
        let currentCond = {};
        let hasArrays = false;

        // convert to patch to get rid of inner objects
        obj = CommonUtils.obj2patch(obj);

        // if the obj has no arrays the currentCond will be used
        // otherwise conditions will be put in currentArrayFilters to be used when called for that arrays
        for (const prop of Object.keys(obj)) {
          if (Array.isArray(obj[prop])) {
            hasArrays = true;
            continue;
          }

          currentCond[prop] = obj[prop];
          currentArrayFilters[`${currentField}.${prop}`] = obj[prop];
        }

        if (!hasArrays) {
          let op = {
            updateMany: {
              filter,
              update: { $pull: { [`${allFields}`]: currentCond } },
            },
          };
          if (arrayFilters?.length) {
            op.updateMany.arrayFilters = arrayFilters;
          }
          bulkOps.push(op);
        } else {
          // recursive apply the same for the arrays
          let newArrayFilters = [...arrayFilters];
          let hasCurrentArrayFilters = Object.keys(currentArrayFilters).length > 0;
          if (hasCurrentArrayFilters) {
            newArrayFilters.push(currentArrayFilters);
          }

          for (const prop of Object.keys(obj)) {
            if (!Array.isArray(obj[prop])) {
              continue;
            }

            Private.getPullBulkOpsFromArray(
              bulkOps,
              filter,
              `${allFields}.$[${hasCurrentArrayFilters ? currentField : ''}].${prop}`,
              prop,
              obj[prop],
              newArrayFilters,
              _ctx
            );
          }
        }
      }
    }
  },
};
const Public = {
  /**
   * convert a remove array to bulk ops
   *
   * ex:  {
   *  tags: [ 'tag1', 'tag2'],          removes tag1 and tag2 from array tag
   *  comments: [ { id: 'id1' } ],      removes entire object with id id1 from array comments
   *  schools: [ { id: 'schooldid1', roles: ['role1'] } ]  removes role1 only from array roles for schoolid1 in array schools
   * }
   *
   * more ex: in test file src/core/test/db-ops.utils/db-ops.array.utils.getPullBulkOpsFromArray.test.js
   */
  getPullBulkOpsFromArray: (filter, removeInfo, _ctx) => {
    let bulkOps = [];

    for (const field in removeInfo) {
      Private.getPullBulkOpsFromArray(bulkOps, filter, field, field, removeInfo[field], [], _ctx);
    }

    return bulkOps;
  },
};

module.exports = { ...Public };
