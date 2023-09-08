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
   * config: {fieldName, service, projection}
   *          fieldName: if empty take data from current object
   */
  populate: async (config, objs, _ctx) => {
    // get all ids first
    let targetsMap = {};
    for (const i in objs) {
      Utils.collectIDs(targetsMap, objs, i, config.fieldName);
    }

    let targetsIDs = Object.keys(targetsMap);
    if (!targetsIDs.length) {
      console.log(`Skipping calling targets to populate info for field ${config.fieldName}`);
      return objs;
    }

    // get all targets
    const projection = config.projection || { id: 1, name: 1, type: 1, status: 1 };
    let rs = await config.service.getAllByIDs(targetsIDs, projection, _ctx);
    if (rs.error) {
      return rs;
    }

    if (targetsIDs.length != rs.value.length) {
      console.log(`Not all targets were found for field ${config.fieldName}`);
    }

    targetsMap = {};
    for (const obj of rs.value) {
      targetsMap[obj.id] = obj;
    }

    // update info
    for (let i in objs) {
      Utils.populate(targetsMap, objs, i, config.fieldName);
    }

    console.log(`Targets expanded for field ${config.fieldName}`);

    return objs;
  },

  /**
   * populate references
   * config: { ..., fillReferences, references: [ {fieldName, service, projection} ] }
   */
  populateReferences: async (config, objs, _ctx) => {
    if (!config.fillReferences) {
      return { status: 200, value: null }; // skipped
    }

    if (!objs) {
      return { status: 200, value: null }; // skipped
    }

    if (!Array.isArray(objs)) {
      objs = [objs];
    }

    for (const configRef of config.references) {
      let r = await Public.populate(configRef, objs, _ctx);
      if (r.error) {
        return r;
      }
    }

    return { status: 200, value: true }; // success
  },

  /**
   * notification when references are changed
   * config: { serviceName, collection, ..., references, fillReferences }
   * notification: { added: [ { id, ... } ], removed[], modified[]  }
   * returns: { status, value } or { status, error }
   */
  onNotificationReferences: async (config, notification, _ctx) => {
    if (!config.fillReferences) {
      return { status: 200, value: null }; // skipped
    }

    let processed = null;

    // configRef: { fieldName, service, projection }
    for (const configRef of config.references) {
      if (configRef.service?.Constants?.ServiceName !== notification.serviceName) {
        console.log(`${config.serviceName}: For ${configRef.fieldName} notification is ignored`);
        continue;
      }

      const projection = configRef.projection || { id: 1, name: 1, type: 1, status: 1 };

      if (notification.modified) {
        console.log(
          `${config.serviceName}: For ${configRef.fieldName} apply changes from notification ${JSON.stringify(
            notification
          )}`
        );

        processed = true;
        // apply modified changes one by one
        for (const refObj of notification.modified) {
          const projectedValue = CommonUtils.getProjectedObj(refObj, projection);
          const rn = await DbOpsUtils.updateManyReferences(config, configRef.fieldName, projectedValue, _ctx);
          if (rn.error) {
            return rn;
          }
        }
      } else if (notification.removed) {
        console.log(
          `${config.serviceName}: For ${configRef.fieldName} apply deletion from notification ${JSON.stringify(
            notification
          )}`
        );

        processed = true;
        // apply deleted changes one by one
        for (const refObj of notification.removed) {
          const projectedValue = CommonUtils.getProjectedObj(refObj, projection);
          const rn = await DbOpsUtils.deleteManyReferences(config, configRef.fieldName, projectedValue, _ctx);
          if (rn.error) {
            return rn;
          }
        }
      } else {
        console.log(`${config.serviceName}: For ${configRef.fieldName} skip notification for added`);
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
