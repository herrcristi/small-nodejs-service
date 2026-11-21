/**
 * Web server init
 */
const WebServerUtils = require('../core/web-server/web-server.utils.js');

const WebConstants = require('./web-server.constants.js');
const ConfigServices = require('../services/config.services.js');
const ConfigSettings = require('../services/config.settings.js');

const Public = {
  /**
   * init
   */
  init: async (port) => {
    console.log('\nInit webserver');

    const routes = ConfigServices.getRoutes();
    const middlewares = ConfigServices.getMiddlewares();
    const usersAuthMiddlewares = ConfigServices.getUsersAuthMiddlewares();

    // the settings of the web server (the core receives them, it does not read the environment)
    const settings = ConfigSettings.getWebServerSettings();
    return await WebServerUtils.init(port, routes, middlewares, usersAuthMiddlewares, settings);
  },
};

module.exports = { ...Public };
