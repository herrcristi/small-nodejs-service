/**
 * Tests Utils
 */

const TestConstants = require('./test-constants.js');

const SchoolsDatabase = require('../services/schools/schools.database.js');

const Public = {
  /**
   * init database
   */
  initDatabase: async (_ctx) => {
    console.log(`\nInserting into database\n`);

    await (await SchoolsDatabase.collection(_ctx)).insertMany(_.cloneDeep(TestConstants.Schools));
  },

  cleanupDatabase: async () => {
    console.log(`\nCleaning up database\n`);
    await (await SchoolsDatabase.db(_ctx)).drop();
  },
};

module.exports = {
  ...Public,
};
