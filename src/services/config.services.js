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

const UsersAuthConstants = require('./users-auth/users-auth.constants.js');
const UsersAuthService = require('./users-auth/users-auth.service.js');
const UsersAuthDatabase = require('./users-auth/users-local-auth.database.js');
const UsersAuthRouter = require('./users-auth/users-auth.router.js');
const UsersAuthRest = require('./rest/users-auth.rest.js');

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

const SchedulesConstants = require('./schedules/schedules.constants.js');
const SchedulesService = require('./schedules/schedules.service.js');
const SchedulesDatabase = require('./schedules/schedules.database.js');
const SchedulesRouter = require('../services/schedules/schedules.router.js');
const SchedulesRest = require('./rest/schedules.rest.js');

const Public = {
  /**
   * init all services
   */
  init: async () => {
    // init databases
    for (const database of [
      SchoolsDatabase,
      UsersAuthDatabase,
      UsersDatabase,
      EventsDatabase,
      StudentsDatabase,
      ProfessorsDatabase,
      ClassesDatabase,
      LocationsDatabase,
      GroupsDatabase,
      SchedulesDatabase,
    ]) {
      await database.init();
    }

    // init services
    for (const service of [
      SchoolsService,
      UsersAuthService,
      UsersService,
      EventsService,
      StudentsService,
      ProfessorsService,
      ClassesService,
      LocationsService,
      GroupsService,
      SchedulesService,
    ]) {
      await service.init();
    }

    // add sync subscribers
    const notifyProjection = { id: 1, name: 1, type: 1, status: 1 };

    // schools
    for (const rest of [UsersRest]) {
      const projection = { ...notifyProjection };
      await SchoolsRest.subscribe({ callback: rest.notification, projection });
    }

    // users
    for (const rest of [StudentsRest, ProfessorsRest, UsersAuthRest]) {
      const projection = { ...notifyProjection, email: 1, schools: 1 };
      await UsersRest.subscribe({ callback: rest.notification, projection });
    }

    // classes
    for (const rest of [StudentsRest, ProfessorsRest, SchedulesRest]) {
      const projection = { ...notifyProjection, description: 1, credits: 1, required: 1 };
      await ClassesRest.subscribe({ callback: rest.notification, projection });
    }

    // groups
    for (const rest of [StudentsRest, SchedulesRest]) {
      const projection = { ...notifyProjection, students: 1 };
      await GroupsRest.subscribe({ callback: rest.notification, projection });
    }

    // students
    for (const rest of [GroupsRest, SchedulesRest]) {
      const projection = { ...notifyProjection, user: 1 };
      await StudentsRest.subscribe({ callback: rest.notification, projection });
    }

    // professors
    for (const rest of [SchedulesRest]) {
      const projection = { ...notifyProjection, user: 1 };
      await ProfessorsRest.subscribe({ callback: rest.notification, projection });
    }

    // schedules
    for (const rest of [ProfessorsRest, GroupsRest, StudentsRest]) {
      const projection = { ...notifyProjection, class: 1, schedules: 1, professors: 1, groups: 1, students: 1 };
      await SchedulesRest.subscribe({ callback: rest.notification, projection });
    }

    // init the communication
    const port = process.env.PORT;
    const config = {
      local: {
        [SchoolsConstants.ServiceName]: SchoolsService,
        [UsersAuthConstants.ServiceName]: UsersAuthService,
        [UsersConstants.ServiceName]: UsersService,
        [EventsConstants.ServiceName]: EventsService,
        [StudentsConstants.ServiceName]: StudentsService,
        [ProfessorsConstants.ServiceName]: ProfessorsService,
        [ClassesConstants.ServiceName]: ClassesService,
        [LocationsConstants.ServiceName]: LocationsService,
        [GroupsConstants.ServiceName]: GroupsService,
        [SchedulesConstants.ServiceName]: SchedulesService,
        // internal calls only
        [SchoolsConstants.ServiceNameInternal]: SchoolsService,
        [UsersAuthConstants.ServiceNameInternal]: UsersAuthService,
        [UsersConstants.ServiceNameInternal]: UsersService,
        [EventsConstants.ServiceNameInternal]: EventsService,
        [StudentsConstants.ServiceNameInternal]: StudentsService,
        [ProfessorsConstants.ServiceNameInternal]: ProfessorsService,
        [ClassesConstants.ServiceNameInternal]: ClassesService,
        [LocationsConstants.ServiceNameInternal]: LocationsService,
        [GroupsConstants.ServiceNameInternal]: GroupsService,
        [SchedulesConstants.ServiceNameInternal]: SchedulesService,
      },

      rest: {
        [SchoolsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: SchoolsConstants.ApiPath,
        },
        [UsersAuthConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: UsersAuthConstants.ApiPath,
        },
        [UsersConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: UsersConstants.ApiPath,
        },
        [EventsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: EventsConstants.ApiPath,
        },
        [StudentsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: StudentsConstants.ApiPath,
        },
        [ProfessorsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: ProfessorsConstants.ApiPath,
        },
        [ClassesConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: ClassesConstants.ApiPath,
        },
        [LocationsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: LocationsConstants.ApiPath,
        },
        [GroupsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: GroupsConstants.ApiPath,
        },
        [SchedulesConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: SchedulesConstants.ApiPath,
        },

        // internal calls only
        [SchoolsConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: SchoolsConstants.ApiPathInternal,
        },
        [UsersAuthConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: UsersAuthConstants.ApiPathInternal,
        },
        [UsersConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: UsersConstants.ApiPathInternal,
        },
        [EventsConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: EventsConstants.ApiPathInternal,
        },
        [StudentsConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: StudentsConstants.ApiPathInternal,
        },
        [ProfessorsConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: ProfessorsConstants.ApiPathInternal,
        },
        [ClassesConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: ClassesConstants.ApiPathInternal,
        },
        [LocationsConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: LocationsConstants.ApiPathInternal,
        },
        [GroupsConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: GroupsConstants.ApiPathInternal,
        },
        [SchedulesConstants.ServiceNameInternal]: {
          protocol: 'http',
          host: 'localhost',
          port: port,
          path: SchedulesConstants.ApiPathInternal,
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
      UsersAuthRouter,
      UsersRouter,
      EventsRouter,
      StudentsRouter,
      ProfessorsRouter,
      ClassesRouter,
      LocationsRouter,
      GroupsRouter,
      SchedulesRouter,
    ];
  },
};

module.exports = { ...Public };
