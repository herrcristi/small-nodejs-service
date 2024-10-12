/**
 * Database Manager
 */
const MongoDB = require('mongodb');

const CommonUtils = require('./common.utils');

const Private = {
  /**
   * clients
   */
  DBClients: {},

  DBIndexes: {},

  /**
   * add connection handlers
   */
  addConnectionHandlers: async (database, dbName, _ctx) => {
    database.once('connected', () => {
      console.log(`\nDatabase Connected to ${dbName}`);
    });

    database.on('close', (error) => {
      console.log(`\nMongo connection for ${dbName} has closed with error ${JSON.stringify(error)}. Reconnecting...`);
    });

    database.on('error', (error) => {
      console.log(`\nMongo connection for ${dbName} has error ${JSON.stringify(error)}`);
    });

    database.on('reconnect', () => {
      console.log(`\nMongo reconnected succesfully for ${dbName}`);
    });

    database.topology.on('reconnectFailed', (error) => {
      console.log(`\nMongo failed to reconnect to ${dbName} with error ${JSON.stringify(error)}`);
      console.log(`\nExit process`);
      process.exit(1);
    });
  },
};

const Public = {
  /**
   * connect to db
   */
  connect: async (dbUrl, dbName, _ctx) => {
    try {
      const cacheKey = `${dbUrl}`;
      if (Private.DBClients[cacheKey]) {
        return Private.DBClients[cacheKey].db(dbName);
      }
      const options = {
        // Specifies the preferences for this connection
        readPreference: 'secondaryPreferred',
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority' },
      };
      let client = await MongoDB.MongoClient.connect(dbUrl, options);
      if (!client) {
        throw new Error(`Cannot connect to ${dbUrl}`);
      }
      Private.DBClients[cacheKey] = client;

      // add connection handlers
      await Private.addConnectionHandlers(client, dbName, _ctx);

      // Send a ping to confirm a successful connection
      await client.db(dbName).command({ ping: 1 });
      console.log(`\nPing successfully db ${dbName}`);

      return client.db(dbName);
    } catch (e) {
      console.log(`\nFailed to connect to mongo for ${dbName}. Error: ${CommonUtils.getLogError(e)}`);
      console.log(`\nExit process`);
      process.exit(1);
    }
  },

  /**
   * check if need to add indexes
   */
  addIndexes: async (db, collectionName, _ctx) => {
    if (!db) {
      return null;
    }

    Private.DBIndexes[db] ??= {};

    // check if it was already added
    if (Private.DBIndexes[db][collectionName]) {
      return false;
    }

    // add it
    Private.DBIndexes[db][collectionName] = 1;
    console.log(`\nAdd indexes for ${collectionName}`);
    return true;
  },
};

module.exports = { ...Public };
