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
    console.log('Events database inited');
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
    // events can be per portal or per tenant
    await Public.createIndexes(_ctx);
    return (await Public.db(_ctx))?.collection(
      EventsConstants.ServiceName + (_ctx.tenantID ? `_${_ctx.tenantID}` : '')
    );
  },

  /**
   * index
   */
  createIndexes: async (_ctx) => {
    let collName = EventsConstants.ServiceName + (_ctx.tenantID ? `_${_ctx.tenantID}` : '');
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

    console.log(`Indexes added for ${collName}`);
  },
};

module.exports = { ...Public };
