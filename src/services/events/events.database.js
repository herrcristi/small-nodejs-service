/**
 * Database
 */
const DBMgr = require('../../core/utils/database-manager.utils.js');

const EventsConstants = require('./events.constants.js');

const Private = {
  DB: null,
};

const Public = {
  /**
   * init
   */
  init: async (_ctx) => {
    Private.DB = await DBMgr.connect(process.env.DATABASE_URL, process.env.DATABASE_EVENTS, _ctx);
    console.log('\nEvents database inited');
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    // events can be per portal or per tenant
    let collName = EventsConstants.ServiceName + (_ctx.tenantID ? `_${_ctx.tenantID}` : '');

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
    await coll?.createIndex({ createdTimestamp: -1 });
    await coll?.createIndex({ severity: 1 });
    await coll?.createIndex({ messageID: 1 });
    await coll?.createIndex({ 'target.id': 1 });
    await coll?.createIndex({ 'target.name': 1 });

    console.log(`\nIndexes added for ${collName}`);
  },
};

module.exports = { ...Public };
