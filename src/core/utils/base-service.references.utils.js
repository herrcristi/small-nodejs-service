/**
 * Base service - references
 */

const CommonUtils = require('./common.utils.js');
const DbOpsUtils = require('./db-ops.utils.js');

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
   * config: {fieldName, service, projection}
   * writtenTarget: the target of this reference written by the same request, as its write answered it (passed by the
   * caller that has it, never from a request): the reference to it is filled from it, it is not read again (a
   * secondary may not have it yet); the other targets are read
   */
  populate: async (configRef, objs, _ctx, writtenTarget) => {
    const fieldsPath = configRef.fieldName.replaceAll('[]', '').split('.');
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
      console.log(`\nSkipping calling targets to populate info for field '${configRef.fieldName}'`);
    } else {
      const projection = configRef.projection || {
        id: 1,
        name: 1,
        type: 1,
        status: 1,
        createdTimestamp: 1,
        modifiedCount: 1,
      };

      // the target written by the same request: the answer of its write
      const writtenID = writtenTarget?.id;
      if (targetsIDs.includes(writtenID)) {
        targetsMap[writtenID] = CommonUtils.getProjectedObj(writtenTarget, projection);
      }

      // get the other targets, on the primary: a target written just before (by an earlier request, or by another
      // service in the same request: the school of a signup) is found, a reference to it would be dropped
      const readIDs = targetsIDs.filter((id) => id !== writtenID);
      if (readIDs.length) {
        const options = { readPreference: DbOpsUtils.Constants.ReadPrimary };
        let rs = await configRef.service.getAllByIDs(readIDs, { ...projection, _id: 0 }, _ctx, options);
        if (rs.error) {
          return rs;
        }

        if (readIDs.length != rs.value.length) {
          console.log(`\nNot all targets were found for field '${configRef.fieldName}'`);
        }

        for (const obj of rs.value) {
          targetsMap[obj.id] = obj;
        }
      }
    }

    // update info
    for (let i in objs) {
      Utils.populate(targetsMap, objs[i], fieldsPath, 0);
    }

    console.log(`\nTargets expanded for field '${configRef.fieldName}'`);

    return { status: 200, value: objs };
  },

  /**
   * populate references
   * config: { ..., fillReferences, references: [ {fieldName, service, projection} ] }
   * writtenTargets: { [fieldName]: target } the targets written by the same request, by the reference that points to
   * them (see populate)
   */
  populateReferences: async (config, obj_objs, _ctx, writtenTargets) => {
    if (!config.fillReferences || !Array.isArray(config.references)) {
      return { status: 200, value: null }; // skipped
    }

    let objs = Array.isArray(obj_objs) ? obj_objs : [obj_objs];
    objs = objs.filter((item) => item != null);
    if (!objs.length) {
      return { status: 200, value: null }; // skipped
    }

    for (const configRef of config.references) {
      const writtenTarget = writtenTargets?.[configRef.fieldName];
      let r = await Public.populate(configRef, objs, _ctx, writtenTarget);
      if (r.error) {
        console.log(
          `\n${config.serviceName}: Failed to populate references for: ${JSON.stringify(
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
};

module.exports = { ...Public };
