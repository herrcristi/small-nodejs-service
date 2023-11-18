/**
 * Base service - references
 */

const DbOpsUtils = require('./db-ops.utils.js');
const CommonUtils = require('./common.utils.js');

const Utils = {
  /**
   * get ids from fieldName
   */
  collectIDs: (targetsMap, objs, i, fieldName) => {
    let obj = objs[i];
    if (obj && fieldName) {
      obj = obj[fieldName];
    }
    if (!obj) {
      return;
    }

    // there are 4 situations: string, object.id, array of strings, array of object.id
    if (Array.isArray(obj)) {
      for (const i in obj) {
        // recursive call
        Utils.collectIDs(targetsMap, obj, i, '');
      }
    } else if (typeof obj === 'string') {
      // assume string is the id
      targetsMap[obj] = 1;
    } else if (typeof obj === 'object') {
      if (obj.id) {
        targetsMap[obj.id] = 1;
      }
    }
  },

  /**
   * populate
   */
  populate: (targetsMap, objs, i, fieldName) => {
    let obj = objs[i];
    if (obj && fieldName) {
      obj = obj[fieldName];
    }
    if (!obj) {
      return;
    }

    // there are 4 situations: string, object.id, array of strings, array of object.id
    if (Array.isArray(obj)) {
      for (const i in obj) {
        // recursive call
        Utils.populate(targetsMap, obj, i, '');
      }
    } else if (typeof obj === 'string') {
      const details = targetsMap[obj];
      if (details) {
        if (fieldName) {
          objs[i][fieldName] = details;
        } else {
          // must set in parent
          objs[i] = details;
        }
      }
    } else if (typeof obj === 'object') {
      if (obj.id) {
        const details = targetsMap[obj.id];
        if (details) {
          Object.assign(obj, details);
        }
      }
    }
  },
};

const Public = {
  /**
   * populate the field by getting the detail info via rest
   * config: {fieldName, service, isArray, projection}
   *          fieldName: if empty take data from current object
   */
  populate: async (configRef, objs, _ctx) => {
    // get all ids first
    let targetsMap = {};
    for (const i in objs) {
      Utils.collectIDs(targetsMap, objs, i, configRef.fieldName);
    }

    let targetsIDs = Object.keys(targetsMap);
    if (!targetsIDs.length) {
      console.log(`Skipping calling targets to populate info for field '${configRef.fieldName}'`);
      return { status: 200, value: objs };
    }

    // get all targets
    const projection = configRef.projection || { id: 1, name: 1, type: 1, status: 1 };
    let rs = await configRef.service.getAllByIDs(targetsIDs, { ...projection, _id: 0 }, _ctx);
    if (rs.error) {
      return rs;
    }

    if (targetsIDs.length != rs.value.length) {
      console.log(`Not all targets were found for field '${configRef.fieldName}'`);
    }

    targetsMap = {};
    for (const obj of rs.value) {
      targetsMap[obj.id] = obj;
    }

    // update info
    for (let i in objs) {
      Utils.populate(targetsMap, objs, i, configRef.fieldName);
    }

    console.log(`Targets expanded for field '${configRef.fieldName}'`);

    return { status: 200, value: objs };
  },

  /**
   * populate references
   * config: { ..., fillReferences, references: [ {fieldName, service, isArray, projection} ] }
   */
  populateReferences: async (config, obj_objs, _ctx) => {
    if (!config.fillReferences || !Array.isArray(config.references)) {
      return { status: 200, value: null }; // skipped
    }

    let objs = Array.isArray(obj_objs) ? obj_objs : [obj_objs];
    objs = objs.filter((item) => item != null);
    if (!objs.length) {
      return { status: 200, value: null }; // skipped
    }

    for (const configRef of config.references) {
      let r = await Public.populate(configRef, objs, _ctx);
      if (r.error) {
        console.log(
          `${config.serviceName}: Failed to populate references for: ${JSON.stringify(
            objs.map((item) => CommonUtils.protectData(item)),
            null,
            2
          )}. Error: ${JSON.stringify(r.error, null, 2)}`
        );
        return r;
      }
    }

    return { status: 200, value: true }; // success
  },

  /**
   * notification when references are changed
   * config: { serviceName, collection, ..., references, fillReferences }
   * notification: { serviceName, added: [ { id, ... } ], removed: [], modified: []  }
   * returns: { status, value } or { status, error }
   */
  onNotificationReferences: async (config, notification, _ctx) => {
    if (!config.fillReferences) {
      return { status: 200, value: null }; // skipped
    }

    let processed = null;

    // configRef: { fieldName, service, isArray, projection }
    for (const configRef of config.references) {
      if (configRef.service?.Constants?.ServiceName !== notification.serviceName) {
        console.log(`${config.serviceName}: For '${configRef.fieldName}' notification is ignored`);
        continue;
      }

      const projection = configRef.projection || { id: 1, name: 1, type: 1, status: 1 };

      if (notification.modified) {
        console.log(
          `${config.serviceName}: For '${
            configRef.fieldName
          }' apply modified changes from notification ${JSON.stringify(notification)}`
        );

        processed = true;
        // apply modified changes one by one
        for (const refObj of notification.modified) {
          const projectedValue = CommonUtils.getProjectedObj(refObj, projection);
          const rn = await DbOpsUtils.updateManyReferences(config, configRef, projectedValue, _ctx);
          if (rn.error) {
            return rn;
          }
        }
      } else if (notification.removed) {
        console.log(
          `${config.serviceName}: For '${configRef.fieldName}' apply deletion from notification ${JSON.stringify(
            notification
          )}`
        );

        processed = true;
        // apply deleted changes one by one
        for (const refObj of notification.removed) {
          const projectedValue = CommonUtils.getProjectedObj(refObj, projection);
          const rn = await DbOpsUtils.deleteManyReferences(config, configRef, projectedValue, _ctx);
          if (rn.error) {
            return rn;
          }
        }
      } else {
        console.log(`${config.serviceName}: For '${configRef.fieldName}' skip apply added changes from notification`);
      }
    }

    console.log(
      `${config.serviceName}: Notification for references processed succesfully: ${JSON.stringify(notification)}`
    );

    // success
    return { status: 200, value: processed };
  },
};

module.exports = { ...Public };
