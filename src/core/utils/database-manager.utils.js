/**
 * Database Manager
 */
const MongoDB = require('mongodb');

const Private = {
  /**
   * add connection handlers
   */
  addConnectionHandlers: async (database, dbName) => {
    database.once('connected', () => {
      console.log(`Database Connected to ${dbName}`);
    });

    database.on('close', (error) => {
      console.log(`Mongo connection closed with error ${JSON.stringify(error)}. Reconnecting...`);
    });

    database.on('error', (error) => {
      console.log(`Mongo error ${JSON.stringify(error)}`);
    });

    database.on('reconnect', () => {
      console.log(`Mongo reconnected succesfully for ${dbName}`);
    });

    database.topology.on('reconnectFailed', (error) => {
      console.log(`Mongo failed to reconnect with error ${JSON.stringify(error)}. Exit process`);
      console.log(`Exit process`);
      process.exit(1);
    });
  },
};

const Public = {
  connect: async (dbName, _ctx) => {
    const dbUrl = `mongodb://localhost:27017/${dbName}`;
    const options = {
      auth: {
        username: '',
        password: '',
      },
    };

    try {
      let client = await MongoDB.MongoClient.connect(dbUrl, options);
      if (!client) {
        throw new Error('Cannot connect');
      }

      // add connection handlers
      await Private.addConnectionHandlers(client);

      // Send a ping to confirm a successful connection
      await client.db('admin').command({ ping: 1 });
      console.log(`Ping successfully for ${dbName}`);

      return client.db();
    } catch (e) {
      console.log(`Failed to connect to mongo for ${dbName}. Error: ${e.stack ? e.stack : e}`);
      console.log(`Exit process`);
      process.exit(1);
    }
  },
};

module.exports = { ...Public };
