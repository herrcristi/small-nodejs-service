/**
 * Web server
 */

const Public = {
  /**
   * init a webserver
   */
  init: async (port, router, _middlewares = null) => {
    console.log(`Init web server on port ${port}`);
  },
};

module.exports = { ...Public };
