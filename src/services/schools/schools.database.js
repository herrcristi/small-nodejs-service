/**
 * Database
 */

const DBMgr = require('../../core/utils/database-manager.utils.js');

const SchoolsConstants = require('./schools.constants.js');

const Private = {
  DB: null,
};

const Public = {
  /**
   * init
   */
  init: async (_ctx) => {
    Private.DB = await DBMgr.connect(process.env.DATABASE_URL, process.env.DATABASE_SCHOOLS, _ctx);
    console.log('\nSchools database inited');
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    let collName = SchoolsConstants.ServiceName;

    await Public.createIndexes(collName, _ctx);
    return Private.DB?.collection(collName);
  },

  /**
   * index
   */
  createIndexes: async (collName, _ctx) => {
    let addIndex = await DBMgr.addIndexes(Private.DB, collName, _ctx);
    if (!addIndex) {
      return;
    }

    let coll = Private.DB?.collection(collName);
    await coll?.createIndex({ id: 1 }, { unique: true });
    await coll?.createIndex({ name: 1 }, { unique: true });

    console.log(`\nIndexes added for ${collName}`);
  },
};

module.exports = { ...Public };
