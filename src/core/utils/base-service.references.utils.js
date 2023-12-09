/**
 * Base service - references
 */

const DbOpsUtils = require('./db-ops.utils.js');
const CommonUtils = require('./common.utils.js');

const Utils = {
  /**
   * convert fieldName to object
   * there are 4 situations:
   *    string, object.id,                    -> object.id
   *    array of strings, array of object.id  -> [ object.id, ... ]
   *
   */
  convertToObject: (obj, fieldsPath, index /*use index to avoid slice*/) => {
    const fieldName = fieldsPath[index];
    const field = obj[fieldName];
    if (!field) {
      return;
    }

    if (index === fieldsPath.length - 1) {
      // last field is the field to be converted
      if (Array.isArray(field)) {
        for (const i in field) {
          if (typeof field[i] === 'string') {
            // assume string is the id
            field[i] = { id: field[i] };
          }
        }
      } else if (typeof field === 'string') {
        // assume string is the id
        obj[fieldName] = { id: field };
      }
    } else {
      // intermediate fields
      if (Array.isArray(field)) {
        for (const i in field) {
          Utils.convertToObject(field[i], fieldsPath, index + 1);
        }
      } else if (typeof field === 'object') {
        Utils.convertToObject(field, fieldsPath, index + 1);
      }
    }
  },

  /**
   * get ids from fieldName
   */
  collectIDs: (targetsMap, obj, fieldsPath, index /*use index to avoid slice*/) => {
    const fieldName = fieldsPath[index];
    const field = obj[fieldName];
    if (!field) {
      return;
    }

    if (index === fieldsPath.length - 1) {
      // last field is the populate field
      const vals = Array.isArray(field) ? field : [field];
      for (const o of vals) {
        if (o?.id) {
          targetsMap[o.id] = 1;
        }
      }
    } else {
      // intermediate fields
      if (Array.isArray(field)) {
        for (const i in field) {
          Utils.collectIDs(targetsMap, field[i], fieldsPath, index + 1);
        }
      } else if (typeof field === 'object') {
        Utils.collectIDs(targetsMap, field, fieldsPath, index + 1);
      }
    }
  },

  /**
   * populate
   */
  populate: (targetsMap, obj, fieldsPath, index /*use index to avoid slice*/) => {
    const fieldName = fieldsPath[index];
    const field = obj[fieldName];
    if (!field) {
      return;
    }

    if (index === fieldsPath.length - 1) {
      // last field is the populate field
      const isArray = Array.isArray(field);
      const vals = isArray ? field : [field];
      let newVals = [];
      for (const o of vals) {
        if (o?.id) {
          const details = targetsMap[o.id];
          if (details) {
            Object.assign(o, details);
            newVals.push(o); // keep only found ones
          }
        }
      }

      obj[fieldName] = isArray ? newVals : newVals.length ? newVals[0] : null;
    } else {
      // intermediate fields
      if (Array.isArray(field)) {
        for (const i in field) {
          Utils.populate(targetsMap, field[i], fieldsPath, index + 1);
        }
      } else if (typeof field === 'object') {
        Utils.populate(targetsMap, field, fieldsPath, index + 1);
      }
    }
  },
};

const Public = {
  /**
   * populate the field by getting the detail info via rest
   * config: {fieldName, service, isArray, projection}
   */
  populate: async (configRef, objs, _ctx) => {
    const fieldsPath = configRef.fieldName.split('.');
    // convert to object first
    for (const i in objs) {
      Utils.convertToObject(objs[i], fieldsPath, 0);
    }

    // get all ids first
    let targetsMap = {};
    for (const i in objs) {
      Utils.collectIDs(targetsMap, objs[i], fieldsPath, 0);
    }

    let targetsIDs = Object.keys(targetsMap);

    targetsMap = {};
    if (!targetsIDs.length) {
      console.log(`Skipping calling targets to populate info for field '${configRef.fieldName}'`);
    } else {
      // get all targets
      const projection = configRef.projection || { id: 1, name: 1, type: 1, status: 1 };
      let rs = await configRef.service.getAllByIDs(targetsIDs, { ...projection, _id: 0 }, _ctx);
      if (rs.error) {
        return rs;
      }

      if (targetsIDs.length != rs.value.length) {
        console.log(`Not all targets were found for field '${configRef.fieldName}'`);
      }

      for (const obj of rs.value) {
        targetsMap[obj.id] = obj;
      }
    }

    // update info
    for (let i in objs) {
      Utils.populate(targetsMap, objs[i], fieldsPath, 0);
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
        continue;
      }

      const projection = configRef.projection || { id: 1, name: 1, type: 1, status: 1 };

      // added
      if (notification.added) {
        // apply added changes one by one
        for (const refObj of notification.added) {
          // changes are applied only if object has an array (of ids or objects with id field)
          // with same name where this is applied
          let targets = refObj[config.serviceName];
          if (targets == null) {
            console.log(
              `${config.serviceName}: For '${configRef.fieldName}' skip apply added changes from notification`
            );
            continue;
          }

          processed = true;
          targets = Array.isArray(targets) ? targets : [targets]; // make array
          const targetIDs = targets
            .map((item) => (typeof item === 'string' ? item : typeof item === 'object' ? item.id : null))
            .filter((item) => item != null);

          const projectedValue = CommonUtils.getProjectedObj(refObj, projection);
          const rn = await DbOpsUtils.addManyReferences(config, targetIDs, configRef, projectedValue, _ctx);
          if (rn.error) {
            return rn;
          }
        }
      }

      // modified
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
      }

      // removed
      if (notification.removed) {
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
