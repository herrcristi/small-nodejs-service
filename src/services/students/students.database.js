/**
 * Database
 */
const DBMgr = require('../../core/utils/database-manager.utils.js');

const StudentsConstants = require('./students.constants.js');

const Private = {
  DB: null,
};

const Public = {
  /**
   * init
   */
  init: async (_ctx) => {
    Private.DB = await DBMgr.connect(process.env.DATABASE_URL, process.env.DATABASE_STUDENTS, _ctx);
    console.log('Students database inited');
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    if (!_ctx.tenantID) {
      console.log(`No tenant for getting students collection`);
      return null;
    }
    // students collections are per tenant
    await Public.createIndexes(_ctx);
    return Private.DB?.collection(StudentsConstants.ServiceName + `_${_ctx.tenantID}`);
  },

  /**
   * index
   */
  createIndexes: async (_ctx) => {
    let collName = StudentsConstants.ServiceName + `_${_ctx.tenantID}`;
    let addIndex = await DBMgr.addIndexes(Private.DB, collName, _ctx);
    if (!addIndex) {
      return;
    }

    let coll = Private.DB?.collection(collName);
    await coll?.createIndex({ id: 1 }, { unique: true });

    console.log(`Indexes added for ${collName}`);
  },
};

module.exports = { ...Public };
