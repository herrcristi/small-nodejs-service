/**
 * Users service
 */

const DbOpsUtils = require('../../core/utils/db-ops.utils.js');

const UsersConstants = require('./users.constants.js');
const SchoolsRest = require('../rest/schools.rest.js');

const Utils = {
  /**
   * get all schools data and fill the users
   */
  fillSchoolsInfo: async (users, _ctx) => {
    // get all schools ids first
    const schoolsMap = {};
    for (const user of users) {
      for (const school of user.schools) {
        schoolsMap[school.id] = 1;
      }
    }

    // get all schools
    const schoolsIDs = Object.keys(schoolsMap);
    let r = await SchoolsRest.getAllByIDs(schoolsIDs, { id: 1, name: 1, type: 1, status: 1 }, _ctx);
    if (r.error) {
      return r;
    }

    if (schoolsIDs.length != r.value.data?.length) {
      console.log(`Not all schools were found`);
    }

    for (const school of r.value.data) {
      schoolsMap[school.id] = school;
    }

    // update info
    for (const user of users) {
      for (const school of user.schools) {
        const schoolDetails = schoolsMap[school.id];
        school.name = schoolDetails?.name;
        school.status = schoolDetails?.status;
      }
    }

    return r;
  },
};

const Public = {
  /**
   * get all
   * filter: { filter, projection, limit, skip, sort }
   */
  getAll: async (filter, _ctx) => {
    let r = await DbOpsUtils.getAll(filter, _ctx);
    if (r.error) {
      return r;
    }

    // TODO implement schools notification and here onSchoolNotification instead of
    // fill schools name and status
    let rs = await Utils.fillSchoolsInfo(r.value, _ctx);
    if (rs.error) {
      return rs;
    }

    // return users
    return r;
  },

  getAllCount: async (filter, _ctx) => {
    return await DbOpsUtils.getAllCount(filter, _ctx);
  },

  getAllByIDs: async (ids, projection, _ctx) => {
    let r = await DbOpsUtils.getAllByIDs(ids, projection, _ctx);
    if (r.error) {
      return r;
    }

    // TODO implement schools notification and here onSchoolNotification instead of
    // fill schools name and status
    if (projection?.schools) {
      let rs = await Utils.fillSchoolsInfo(r.value, _ctx);
      if (rs.error) {
        return rs;
      }
    }

    // return users
    return r;
  },

  /**
   * get one
   */
  getOne: async (objID, _ctx) => {
    return await DbOpsUtils.getOne(objID, null /* projection */, _ctx);
  },

  /**
   * post
   */
  post: async (objInfo, _ctx) => {
    // add name
    objInfo.name = `${objInfo.firstName} ${objInfo.lastName}`;
    objInfo.type = UsersConstants.Type;

    const r = await DbOpsUtils.post(objInfo, _ctx);
    if (r.error) {
      return r;
    }

    // TODO raise notification

    return r;
  },

  /**
   * delete
   */
  delete: async (objID, _ctx) => {
    const projection = { id: 1, name: 1, type: 1, status: 1 };
    const r = await DbOpsUtils.delete(objID, projection, _ctx);
    if (r.error) {
      return r;
    }

    if (r.value) {
      // TODO raise notification
    }

    return r;
  },

  /**
   * put
   */
  put: async (objID, objInfo, _ctx) => {
    const projection = { id: 1, name: 1, type: 1, status: 1 };
    const r = await DbOpsUtils.put(objID, objInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    if (r.value) {
      // TODO raise notification
    }

    return r;
  },

  /**
   * patch
   */
  patch: async (objID, patchInfo, _ctx) => {
    const projection = { id: 1, name: 1, type: 1, status: 1 };
    const r = await DbOpsUtils.patch(objID, patchInfo, projection, _ctx);
    if (r.error) {
      return r;
    }

    if (r.value) {
      // TODO raise notification
    }

    return r;
  },
};

module.exports = { ...Public };
