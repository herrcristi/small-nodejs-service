/**
 * Database
 */
const DBMgr = require('../../core/utils/database-manager.utils');

const StudentsConstants = require('./students.constants');

const Private = {
  DB: null,
};

const Public = {
  /**
   * init
   */
  init: async (_ctx) => {
    console.log('Init students database');
    Private.DB = await DBMgr.connect(process.env.DATABASE_URL, process.env.DATABASE_STUDENTS, _ctx);
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    // students collections are per tenant
    await Public.createIndexes(_ctx);
    return Private.DB?.collection(StudentsConstants.ServiceName + `_${_ctx.tenantID}`);
  },

  /**
   * index
   */
  createIndexes: async (_ctx) => {
    let collName = StudentsConstants.ServiceName + `_${_ctx.tenantID}`;
    if (!DBMgr.addIndexes(Private.DB, collName, _ctx)) {
      return;
    }

    let coll = Private.DB?.collection(collName);
    await coll?.createIndex({ id: 1 }, { unique: true });

    console.log(`Indexes added for ${collName}`);
  },
};

module.exports = { ...Public };
