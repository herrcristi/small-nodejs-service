/**
 * Services Config
 */
const RestCommsUtils = require('../core/utils/rest-communications.utils.js');

const SchoolsConstants = require('./schools/schools.constants.js');
const SchoolsService = require('./schools/schools.service.js');
const SchoolsRouter = require('../services/schools/schools.router.js');

const UsersConstants = require('./users/users.constants.js');
const UsersService = require('./users/users.service.js');
const UsersRouter = require('../services/users/users.router.js');

const StudentsConstants = require('./students/students.constants.js');
const StudentsService = require('./students/students.service.js');
const StudentsRouter = require('../services/students/students.router.js');

const Public = {
  /**
   * init all services
   */
  init: async () => {
    // init the communication
    const config = {
      local: {
        [SchoolsConstants.ServiceName]: SchoolsService,
        [UsersConstants.ServiceName]: UsersService,
        [StudentsConstants.ServiceName]: StudentsService,
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
