/**
 * Database
 */

const DBMgr = require('../../core/utils/database-manager.utils');

const SchoolsConstants = require('./schools.constants');

const Private = {
  DB: null,
};

const Public = {
  /**
   * init
   */
  init: async (_ctx) => {
    console.log('Init schools database');
    Private.DB = await DBMgr.connect(process.env.DATABASE_URL, process.env.DATABASE_SCHOOLS, _ctx);
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    await Public.createIndexes(_ctx);
    return Private.DB?.collection(SchoolsConstants.ServiceName);
  },

  /**
   * index
   */
  createIndexes: async (_ctx) => {
    let collName = SchoolsConstants.ServiceName;
    let addIndex = await DBMgr.addIndexes(Private.DB, collName, _ctx);
    if (!addIndex) {
      return;
    }

    let coll = Private.DB?.collection(collName);
    await coll?.createIndex({ id: 1 }, { unique: true });
    await coll?.createIndex({ name: 1 }, { unique: true });

    console.log(`Indexes added for ${collName}`);
  },
};

module.exports = { ...Public };
