/**
 * Database Manager
 *
 * the limits of the database are given by the application (init); a missing or a wrong value is the default
 */
const MongoDB = require('mongodb');

const CommonUtils = require('./common.utils');

const Constants = {
  // the connections of a process to each member of the replica set (the driver allows 100 by default: with many pods
  // the members run out of connections)
  MaxPoolSize: 16,

  // how long a request waits for a free connection of the pool, in seconds (the driver waits for ever by default): it
  // then fails (503) instead of hanging until the proxy gives up
  WaitQueueTimeout: 30,

  // how long a database call may run, in seconds (the driver has no limit by default): the server stops it (maxTimeMS)
  // and the request fails (503) instead of holding its connection; a write that waits for the replicas is stopped too
  QueryTimeout: 30,
};

const Private = {
  /**
   * clients
   */
  DBClients: {},

  DBIndexes: {},

  // the limits checked by init: { maxPoolSize, waitQueueTimeout (seconds), queryTimeout (seconds) }
  Limits: {
    maxPoolSize: Constants.MaxPoolSize,
    waitQueueTimeout: Constants.WaitQueueTimeout,
    queryTimeout: Constants.QueryTimeout,
  },

  /**
   * a value given by the application (a positive integer, also as a string), or the default
   */
  positiveInteger: (value, defaultValue) => {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : defaultValue;
  },

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
  Constants,

  /**
   * the limits of the application (its settings), given before the first connect: { maxPoolSize, waitQueueTimeout
   * (seconds), queryTimeout (seconds) }; a missing or a wrong value (not a positive whole number) is the default
   */
  init: (limits) => {
    Private.Limits = {
      maxPoolSize: Private.positiveInteger(limits?.maxPoolSize, Constants.MaxPoolSize),
      waitQueueTimeout: Private.positiveInteger(limits?.waitQueueTimeout, Constants.WaitQueueTimeout),
      queryTimeout: Private.positiveInteger(limits?.queryTimeout, Constants.QueryTimeout),
    };
  },

  /**
   * the time limit of a database call, for its options (DbOpsUtils): { maxTimeMS }; the server stops a call that runs
   * longer (MaxTimeMSExpired)
   */
  getTimeLimit: () => {
    return { maxTimeMS: Private.Limits.queryTimeout * 1000 };
  },

  /**
   * connect to db
   */
  connect: async (dbUrl, dbName, _ctx) => {
    try {
      const cacheKey = `${dbUrl}`;
      if (Private.DBClients[cacheKey]) {
        return Private.DBClients[cacheKey].db(dbName);
      }
      // the limits: the connections to each member, how long a request waits for one and how long a call may run
      // (its maxTimeMS is given by each call, DbOpsUtils)
      const { maxPoolSize, waitQueueTimeout, queryTimeout } = Private.Limits;
      console.log(
        `\nDatabase limits for ${dbName}: ${maxPoolSize} connections per member, a request waits ${waitQueueTimeout} s for a connection, a database call runs ${queryTimeout} s at most`
      );

      const options = {
        // Specifies the preferences for this connection
        readPreference: 'secondaryPreferred',
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority' },
        maxPoolSize,
        waitQueueTimeoutMS: waitQueueTimeout * 1000,
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
