/**
 * Web server init
 */
const WebServerUtils = require('../core/web-server/web-server.utils.js');

const WebConstants = require('./web-server.constants.js');
const ConfigServices = require('../services/config.services.js');

const Public = {
  /**
   * init
   */
  init: async (port) => {
    console.log('\nInit webserver');

    const routes = ConfigServices.getRoutes();
    const middlewares = ConfigServices.getMiddlewares();
    const usersAuthMiddlewares = ConfigServices.getUsersAuthMiddlewares();
    return await WebServerUtils.init(port, routes, middlewares, usersAuthMiddlewares);
  },
};

module.exports = { ...Public };
