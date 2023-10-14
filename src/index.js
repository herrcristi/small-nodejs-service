/**
 * Entry point of the service
 */
const fs = require('fs');
const path = require('path');

const TranslationsUtils = require('./core/utils/translations.utils.js');
const WebServer = require('./web-server/web-server.js');
const ConfigServices = require('./services/config.services.js');

const { EventEmitter } = require('events');

/**
 * constants
 */
const Constants = {
  Languages: ['en', 'ro'],

  event: new EventEmitter(),
};

const Public = {
  /**
   * init env
   */
  initEnv: async () => {
    console.log(`Current env: ${process.env.NODE_ENV}`);

    const envFile = path.resolve(__dirname, `./.${process.env.NODE_ENV}.env`);
    if (fs.existsSync(envFile)) {
      let config = require('dotenv').config({ path: envFile, override: true });
      require('dotenv-expand').expand(config);
      return true;
    }
    return false;
  },

  /**
   * init micro service
   */
  init: async () => {
    try {
      console.log('Init service');

      // init env
      await Public.initEnv();

      // init language
      for (const lang of Constants.Languages) {
        await TranslationsUtils.initLanguage(lang, path.resolve(__dirname, `translations/${lang}.json`));
      }

      // init services
      await ConfigServices.init();

      // init web server
      await WebServer.init();

      // emit that service was inited
      console.log('Service inited');
      Constants.event.emit('inited');

      return true;
    } catch (e) {
      console.log(`Failed to init service. Error: ${e.stack ? e.stack : e}`);
      process.exit(1);
    }
  },
};

/**
 * auto init
 */
Public.init();

module.exports = {
  ...Public,
  ...Constants,
};
