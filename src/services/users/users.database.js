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
    console.log('Users database inited');
  },

  /**
   * get db
   */
  db: async (_ctx) => {
    return Private.DB;
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    await Public.createIndexes(_ctx);
    return (await Public.db(_ctx))?.collection(UsersConstants.ServiceName);
  },

  /**
   * index
   */
  createIndexes: async (_ctx) => {
    let collName = UsersConstants.ServiceName;
    let addIndex = await DBMgr.addIndexes(Private.DB, collName, _ctx);
    if (!addIndex) {
      return;
    }

    let coll = Private.DB?.collection(collName);
    await coll?.createIndex({ id: 1 }, { unique: true });
    await coll?.createIndex({ email: 1 }, { unique: true });
    await coll?.createIndex({ name: 1 });
    await coll?.createIndex({ 'schools.id': 1 });

    console.log(`Indexes added for ${collName}`);
  },
};

module.exports = { ...Public };
