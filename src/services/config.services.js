/**
 * Services Config
 */
const RestCommsUtils = require('../core/utils/rest-communications.utils.js');

const WebConstants = require('../web-server/web-server.constants.js');

const SchoolsConstants = require('./schools/schools.constants.js');
const SchoolsService = require('./schools/schools.service.js');
const SchoolsDatabase = require('./schools/schools.database.js');
const SchoolsRouter = require('./schools/schools.router.js');
const SchoolsRest = require('./rest/schools.rest.js');

const UsersConstants = require('./users/users.constants.js');
const UsersService = require('./users/users.service.js');
const UsersDatabase = require('./users/users.database.js');
const UsersRouter = require('./users/users.router.js');
const UsersRest = require('./rest/users.rest.js');

const EventsConstants = require('./events/events.constants.js');
const EventsService = require('./events/events.service.js');
const EventsDatabase = require('./events/events.database.js');
const EventsRouter = require('./events/events.router.js');
const EventsRest = require('./rest/events.rest.js');

const StudentsConstants = require('./students/students.constants.js');
const StudentsService = require('./students/students.service.js');
const StudentsDatabase = require('./students/students.database.js');
const StudentsRouter = require('../services/students/students.router.js');
const StudentsRest = require('./rest/students.rest.js');

const ProfessorsConstants = require('./professors/professors.constants.js');
const ProfessorsService = require('./professors/professors.service.js');
const ProfessorsDatabase = require('./professors/professors.database.js');
const ProfessorsRouter = require('../services/professors/professors.router.js');
const ProfessorsRest = require('./rest/professors.rest.js');

const ClassesConstants = require('./classes/classes.constants.js');
const ClassesService = require('./classes/classes.service.js');
const ClassesDatabase = require('./classes/classes.database.js');
const ClassesRouter = require('../services/classes/classes.router.js');
const ClassesRest = require('./rest/classes.rest.js');

const LocationsConstants = require('./locations/locations.constants.js');
const LocationsService = require('./locations/locations.service.js');
const LocationsDatabase = require('./locations/locations.database.js');
const LocationsRouter = require('../services/locations/locations.router.js');
const LocationsRest = require('./rest/locations.rest.js');

const GroupsConstants = require('./groups/groups.constants.js');
const GroupsService = require('./groups/groups.service.js');
const GroupsDatabase = require('./groups/groups.database.js');
const GroupsRouter = require('../services/groups/groups.router.js');
const GroupsRest = require('./rest/groups.rest.js');

const Public = {
  /**
   * init all services
   */
  init: async () => {
    // init databases
    for (const database of [
      SchoolsDatabase,
      UsersDatabase,
      EventsDatabase,
      StudentsDatabase,
      ProfessorsDatabase,
      ClassesDatabase,
      LocationsDatabase,
      GroupsDatabase,
    ]) {
      await database.init();
    }

    // init services
    for (const service of [
      SchoolsService,
      UsersService,
      EventsService,
      StudentsService,
      ProfessorsService,
      ClassesService,
      LocationsService,
      GroupsService,
    ]) {
      await service.init();
    }

    // add sync subscribers
    await SchoolsRest.subscribe({ callback: UsersRest.notification, projection: null /*default*/ });

    await UsersRest.subscribe({
      callback: StudentsRest.notification,
      projection: { id: 1, name: 1, type: 1, status: 1, email: 1, schools: 1 },
    });
    await UsersRest.subscribe({
      callback: ProfessorsRest.notification,
      projection: { id: 1, name: 1, type: 1, status: 1, email: 1, schools: 1 },
    });

    await ClassesRest.subscribe({
      callback: StudentsRest.notification,
      projection: { id: 1, name: 1, type: 1, status: 1, description: 1, credits: 1, required: 1 },
    });
    await ClassesRest.subscribe({
      callback: ProfessorsRest.notification,
      projection: { id: 1, name: 1, type: 1, status: 1, description: 1, credits: 1, required: 1 },
    });

    await GroupsRest.subscribe({
      callback: StudentsRest.notification,
      projection: { id: 1, name: 1, type: 1, status: 1, students: 1 },
    });

    await StudentsRest.subscribe({
      callback: GroupsRest.notification,
      projection: { id: 1, name: 1, type: 1, status: 1 },
    });

    // init the communication
    const config = {
      local: {
        [SchoolsConstants.ServiceName]: SchoolsService,
        [UsersConstants.ServiceName]: UsersService,
        [EventsConstants.ServiceName]: EventsService,
        [StudentsConstants.ServiceName]: StudentsService,
        [ProfessorsConstants.ServiceName]: ProfessorsService,
        [ClassesConstants.ServiceName]: ClassesService,
        [LocationsConstants.ServiceName]: LocationsService,
        [GroupsConstants.ServiceName]: GroupsService,

        // internal calls only
        [SchoolsConstants.ServiceNameInternal]: SchoolsService,
        [UsersConstants.ServiceNameInternal]: UsersService,
        [EventsConstants.ServiceNameInternal]: EventsService,
        [StudentsConstants.ServiceNameInternal]: StudentsService,
        [ProfessorsConstants.ServiceNameInternal]: ProfessorsService,
        [ClassesConstants.ServiceNameInternal]: ClassesService,
        [LocationsConstants.ServiceNameInternal]: LocationsService,
        [GroupsConstants.ServiceNameInternal]: GroupsService,
      },

      rest: {
        [SchoolsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: SchoolsConstants.ApiPath,
        },
        [UsersConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: UsersConstants.ApiPath,
        },
        [EventsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: EventsConstants.ApiPath,
        },
        [StudentsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: StudentsConstants.ApiPath,
        },
        [ProfessorsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: ProfessorsConstants.ApiPath,
        },
        [ClassesConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: ClassesConstants.ApiPath,
        },
        [LocationsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: LocationsConstants.ApiPath,
        },
        [GroupsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: GroupsConstants.ApiPath,
        },

        // internal calls only
        [SchoolsConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: SchoolsConstants.ApiPathInternal,
        },
        [UsersConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: UsersConstants.ApiPathInternal,
        },
        [EventsConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: EventsConstants.ApiPathInternal,
        },
        [StudentsConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: StudentsConstants.ApiPathInternal,
        },
        [ProfessorsConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: ProfessorsConstants.ApiPathInternal,
        },
        [ClassesConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: ClassesConstants.ApiPathInternal,
        },
        [LocationsConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: LocationsConstants.ApiPathInternal,
        },
        [GroupsConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: GroupsConstants.ApiPathInternal,
        },
      },
    };

    await RestCommsUtils.init(config);
  },

  /**
   * get routes
   */
  getRoutes: () => {
    return [
      SchoolsRouter,
      UsersRouter,
      EventsRouter,
      StudentsRouter,
      ProfessorsRouter,
      ClassesRouter,
      LocationsRouter,
      GroupsRouter,
    ];
  },
};

module.exports = { ...Public };
