/**
 * Services Config
 */
const RestCommsUtils = require('../core/utils/rest-communications.utils.js');

const WebConstants = require('../web-server/web-server.constants.js');

const SchoolsConstants = require('./schools/schools.constants.js');
const SchoolsService = require('./schools/schools.service.js');
const SchoolsDatabase = require('./schools/schools.database.js');
const SchoolsRouter = require('../services/schools/schools.router.js');

const UsersConstants = require('./users/users.constants.js');
const UsersService = require('./users/users.service.js');
const UsersDatabase = require('./users/users.database.js');
const UsersRouter = require('../services/users/users.router.js');

const StudentsConstants = require('./students/students.constants.js');
const StudentsService = require('./students/students.service.js');
const StudentsDatabase = require('./students/students.database.js');
const StudentsRouter = require('../services/students/students.router.js');

const Public = {
  /**
   * init all services
   */
  init: async () => {
    // init databases
    for (const database of [SchoolsDatabase, UsersDatabase, StudentsDatabase]) {
      await database.init();
    }

    // init the communication
    const config = {
      local: {
        [SchoolsConstants.ServiceName]: SchoolsService,
        [UsersConstants.ServiceName]: UsersService,
        [StudentsConstants.ServiceName]: StudentsService,
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
        [StudentsConstants.ServiceName]: {
          protocol: 'http',
          host: 'localhost',
          port: WebConstants.Port,
          path: StudentsConstants.ApiPath,
        },
      },
    };

    await RestCommsUtils.init(config);
  },

  /**
   * get routes
   */
  getRoutes: () => {
    return [SchoolsRouter, UsersRouter, StudentsRouter];
  },
};

module.exports = { ...Public };
