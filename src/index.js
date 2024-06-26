/**
 * Entry point of the service
 */
const fs = require('fs');
const path = require('path');

const CommonUtils = require('./core/utils/common.utils.js');
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
    console.log(`\nCurrent env: ${process.env.NODE_ENV}`);

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
      console.log('\nInit service');

      // init env
      await Public.initEnv();

      // init language
      for (const lang of Constants.Languages) {
        await TranslationsUtils.initStrings(lang, path.resolve(__dirname, `translations/${lang}.json`));
        await TranslationsUtils.initEmails(lang, path.resolve(__dirname, `translations/${lang}.emails.json`));
      }

      const port = process.env.PORT;
      // init services
      await ConfigServices.init(port);

      // init web server
      await WebServer.init(port);

      // emit that service was inited
      console.log('\nService inited');
      Constants.event.emit('inited');

      return true;
    } catch (e) {
      console.log(`\nFailed to init service. Error: ${CommonUtils.getLogError(e)}`);
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
