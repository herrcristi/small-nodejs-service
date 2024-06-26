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

    return await WebServerUtils.init(
      port,
      ConfigServices.getRoutes(),
      ConfigServices.getMiddlewares(),
      ConfigServices.getUsersAuthMiddlewares()
    );
  },
};

module.exports = { ...Public };
