/**
 * Database
 */
const DBMgr = require('../../core/utils/database-manager.utils.js');

const UsersConstants = require('./users.constants.js');

const Private = {
  DB: null,
};

const Public = {
  /**
   * init
   */
  init: async (_ctx) => {
    Private.DB = await DBMgr.connect(process.env.DATABASE_URL, process.env.DATABASE_USERS, _ctx);
    console.log('\nUsers database inited');
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    let collName = UsersConstants.ServiceName;

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
    await coll?.createIndex({ email: 1 }, { unique: true });
    await coll?.createIndex({ name: 1 });
    await coll?.createIndex({ 'schools.id': 1 });

    console.log(`\nIndexes added for ${collName}`);
  },
};

module.exports = { ...Public };
