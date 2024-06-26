/**
 * Database
 */
const DBMgr = require('../../core/utils/database-manager.utils.js');

const GroupsConstants = require('./groups.constants.js');

const Private = {
  DB: null,
};

const Public = {
  /**
   * init
   */
  init: async (_ctx) => {
    Private.DB = await DBMgr.connect(process.env.DATABASE_URL, process.env.DATABASE_GROUPS, _ctx);
    console.log('\nGroups database inited');
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    if (!_ctx.tenantID) {
      console.log(`\nNo tenant for getting groups collection. Stack: ${new Error().stack}`);
      return null;
    }
    // groupes collections are per tenant
    let collName = GroupsConstants.ServiceName + `_${_ctx.tenantID}`;

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

    await coll?.createIndex({ 'students.id': 1 }, {});
    await coll?.createIndex({ 'schedules.id': 1 }, {});

    console.log(`\nIndexes added for ${collName}`);
  },
};

module.exports = { ...Public };
