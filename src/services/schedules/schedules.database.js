/**
 * Database
 */
const DBMgr = require('../../core/utils/database-manager.utils.js');

const SchedulesConstants = require('./schedules.constants.js');

const Private = {
  DB: null,
};

const Public = {
  /**
   * init
   */
  init: async (_ctx) => {
    Private.DB = await DBMgr.connect(process.env.DATABASE_URL, process.env.DATABASE_SCHEDULES, _ctx);
    console.log('\nSchedules database inited');
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    if (!_ctx.tenantID) {
      console.log(`\nNo tenant for getting schedules collection. Stack: ${new Error().stack}`);
      return null;
    }
    // schedules collections are per tenant
    let collName = SchedulesConstants.ServiceName + `_${_ctx.tenantID}`;

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

    await coll?.createIndex({ 'class.id': 1 }, {});
    await coll?.createIndex({ 'schedules.location.id': 1 }, {});
    await coll?.createIndex({ 'groups.id': 1 }, {});
    await coll?.createIndex({ 'professors.id': 1 }, {});
    await coll?.createIndex({ 'students.id': 1 }, {});

    console.log(`\nIndexes added for ${collName}`);
  },
};

module.exports = { ...Public };
