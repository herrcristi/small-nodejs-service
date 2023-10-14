/**
 * Tests Utils
 */
const _ = require('lodash');

const TestConstants = require('./test-constants.js');

const SchoolsDatabase = require('../services/schools/schools.database.js');

const Public = {
  /**
   * init database
   */
  initDatabase: async (_ctx) => {
    console.log(`\nInserting into database\n`);

    await (await SchoolsDatabase.db(_ctx)).dropDatabase();
    await (await SchoolsDatabase.collection(_ctx)).insertMany(_.cloneDeep(TestConstants.Schools));
  },

  /**
   * cleanup database
   */
  cleanupDatabase: async (_ctx) => {
    console.log(`\nCleaning up database\n`);

    await (await SchoolsDatabase.db(_ctx)).dropDatabase();
  },
};

module.exports = {
  ...Public,
};
