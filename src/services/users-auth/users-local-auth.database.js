/**
 * Database
 */
const DBMgr = require('../../core/utils/database-manager.utils.js');

const UsersAuthConstants = require('./users-auth.constants.js');

const Private = {
  DB: null,
};

const Public = {
  /**
   * init
   */
  init: async (_ctx) => {
    // TODO init only if local auth is used
    Private.DB = await DBMgr.connect(process.env.DATABASE_URL, process.env.DATABASE_USERS_AUTH, _ctx);
    console.log('Users Auth database inited');
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    let collName = UsersAuthConstants.ServiceName;

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
    await coll?.createIndex({ id: 1 }, { unique: true }); // id is the email

    console.log(`Indexes added for ${collName}`);
  },
};

module.exports = { ...Public };
