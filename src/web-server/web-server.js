/**
 * Web server init
 */
const CoreWebServer = require('../core/web-server/web-server.js');

const WebConstants = require('./web-server.constants.js');
const ConfigServices = require('../services/config.services.js');

const Public = {
  /**
   * init
   */
  init: async () => {
    console.log('Init webserver');

    await CoreWebServer.init(WebConstants.Port, ConfigServices.getRoutes());
  },
};

module.exports = { ...Public };
