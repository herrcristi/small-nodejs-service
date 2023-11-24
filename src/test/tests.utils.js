/**
 * Tests Utils
 */
const _ = require('lodash');

const TestConstants = require('./test-constants.js');

const EventsDatabase = require('../services/events/events.database.js');
const SchoolsDatabase = require('../services/schools/schools.database.js');
const UsersDatabase = require('../services/users/users.database.js');
const StudentsDatabase = require('../services/students/students.database.js');
const ProfessorsDatabase = require('../services/professors/professors.database.js');
const ClassesDatabase = require('../services/classes/classes.database.js');
const LocationsDatabase = require('../services/locations/locations.database.js');
const GroupsDatabase = require('../services/groups/groups.database.js');
const SchedulesDatabase = require('../services/schedules/schedules.database.js');

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
    if (_ctx.tenantID) {
      await (await StudentsDatabase.collection(_ctx)).insertMany(_.cloneDeep(TestConstants.Students));
      await (await ProfessorsDatabase.collection(_ctx)).insertMany(_.cloneDeep(TestConstants.Professors));
      await (await ClassesDatabase.collection(_ctx)).insertMany(_.cloneDeep(TestConstants.Classes));
      await (await LocationsDatabase.collection(_ctx)).insertMany(_.cloneDeep(TestConstants.Locations));
      await (await GroupsDatabase.collection(_ctx)).insertMany(_.cloneDeep(TestConstants.Groups));
      await (await SchedulesDatabase.collection(_ctx)).insertMany(_.cloneDeep(TestConstants.Schedules));
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
    if (_ctx.tenantID) {
      await (await EventsDatabase.collection(_ctx)).deleteMany();
      await (await StudentsDatabase.collection(_ctx)).deleteMany();
      await (await ProfessorsDatabase.collection(_ctx)).deleteMany();
      await (await ClassesDatabase.collection(_ctx)).deleteMany();
      await (await LocationsDatabase.collection(_ctx)).deleteMany();
      await (await GroupsDatabase.collection(_ctx)).deleteMany();
      await (await SchedulesDatabase.collection(_ctx)).deleteMany();
    }
    for (const school of TestConstants.Schools) {
      await (await EventsDatabase.collection({ ..._ctx, tenantID: school.id })).deleteMany();
      await (await StudentsDatabase.collection({ ..._ctx, tenantID: school.id })).deleteMany();
      await (await ProfessorsDatabase.collection({ ..._ctx, tenantID: school.id })).deleteMany();
      await (await ClassesDatabase.collection({ ..._ctx, tenantID: school.id })).deleteMany();
      await (await LocationsDatabase.collection({ ..._ctx, tenantID: school.id })).deleteMany();
      await (await GroupsDatabase.collection({ ..._ctx, tenantID: school.id })).deleteMany();
      await (await SchedulesDatabase.collection({ ..._ctx, tenantID: school.id })).deleteMany();
    }
  },
};

module.exports = {
  ...Public,
};
