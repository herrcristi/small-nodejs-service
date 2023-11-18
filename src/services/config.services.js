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

const Public = {
  /**
   * init all services
   */
  init: async () => {
    // init databases
    for (const database of [SchoolsDatabase, UsersDatabase, EventsDatabase, StudentsDatabase]) {
      await database.init();
    }

    // init services
    for (const service of [SchoolsService, UsersService, EventsService, StudentsService]) {
      await service.init();
    }

    // add sync subscribers
    await SchoolsRest.subscribe({ callback: UsersRest.notification, projection: null /*default*/ });
    await UsersRest.subscribe({
      callback: StudentsRest.notification,
      projection: { id: 1, name: 1, type: 1, status: 1, email: 1, schools: 1 },
    });

    // init the communication
    const config = {
      local: {
        [SchoolsConstants.ServiceName]: SchoolsService,
        [UsersConstants.ServiceName]: UsersService,
        [EventsConstants.ServiceName]: EventsService,
        [StudentsConstants.ServiceName]: StudentsService,

        // internal calls only
        [SchoolsConstants.ServiceNameInternal]: SchoolsService,
        [UsersConstants.ServiceNameInternal]: UsersService,
        [EventsConstants.ServiceNameInternal]: EventsService,
        [StudentsConstants.ServiceNameInternal]: StudentsService,
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
      },
    };

    await RestCommsUtils.init(config);
  },

  /**
   * get routes
   */
  getRoutes: () => {
    return [SchoolsRouter, UsersRouter, EventsRouter, StudentsRouter];
  },
};

module.exports = { ...Public };
