/**
 * Tests Utils
 */
const _ = require('lodash');

const TestConstants = require('./test-constants.js');

const EventsDatabase = require('../services/events/events.database.js');
const SchoolsDatabase = require('../services/schools/schools.database.js');
const UsersDatabase = require('../services/users/users.database.js');
const StudentsDatabase = require('../services/students/students.database.js');

const Public = {
  /**
   * init database
   */
  initDatabase: async (_ctx) => {
    await Public.cleanupDatabase(_ctx);

    console.log(`\nInserting into database\n`);

    await (await EventsDatabase.collection(_ctx)).insertMany(_.cloneDeep(TestConstants.Events));
    await (await SchoolsDatabase.collection(_ctx)).insertMany(_.cloneDeep(TestConstants.Schools));
    await (await UsersDatabase.collection(_ctx)).insertMany(_.cloneDeep(TestConstants.Users));
    if (_ctx.tentantID) {
      await (await StudentsDatabase.collection(_ctx)).insertMany(_.cloneDeep(TestConstants.Students));
    }
  },

  /**
   * cleanup database
   */
  cleanupDatabase: async (_ctx) => {
    console.log(`\nCleaning up database\n`);

    await (await EventsDatabase.collection(_ctx)).deleteMany();
    await (await SchoolsDatabase.collection(_ctx)).deleteMany();
    await (await UsersDatabase.collection(_ctx)).deleteMany();
    if (_ctx.tentantID) {
      await (await StudentsDatabase.collection(_ctx)).deleteMany();
    }
  },
};

module.exports = {
  ...Public,
};
