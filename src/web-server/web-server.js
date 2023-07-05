/**
 * Web server init
 */
const CoreWebServer = require('../core/web-server/web-server.js');

const WebConstants = require('./web-server.constants.js');
const StudentsRouter = require('../services/students/students.router.js');

const Public = {
  /**
   * init
   */
  init: async () => {
    console.log('Init webserver');

    await CoreWebServer.init(WebConstants.Port, [StudentsRouter]);
  },
};

module.exports = { ...Public };
