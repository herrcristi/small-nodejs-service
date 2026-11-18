/**
 * Database of the sessions and the emailed links
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
    Private.DB = await DBMgr.connect(process.env.SMALL_API_DATABASE_URL, process.env.SMALL_API_DATABASE_DB, _ctx);
    console.log('\nUsers Auth Sessions database inited');
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    const collName = UsersAuthConstants.SessionsServiceName;

    await Public.createIndexes(collName, _ctx);
    return Private.DB?.collection(collName);
  },

  /**
   * index
   */
  createIndexes: async (collName, _ctx) => {
    const addIndex = await DBMgr.addIndexes(Private.DB, collName, _ctx);
    if (!addIndex) {
      return;
    }

    const coll = Private.DB?.collection(collName);
    await coll?.createIndex({ id: 1 }, { unique: true }); // id is the hash of the secret of the token
    await coll?.createIndex({ userID: 1 }); // the records of a user are ended together
    await coll?.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // the database removes the expired records

    console.log(`\nIndexes added for ${collName}`);
  },
};

module.exports = { ...Public };
