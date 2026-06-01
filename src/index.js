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
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    console.log(`\nCurrent env: ${process.env.NODE_ENV}`);

    const expectedValues = [
      'SMALL_API_URL',
      'SMALL_API_PORT',

      'SMALL_API_AUTH_PROVIDER_TYPE',
      'SMALL_API_SALT',
      'SMALL_API_S2SPASS',
      'SMALL_API_PREVAUTHPASS',
      'SMALL_API_AUTHPASS',

      'SMALL_API_CORS_ORIGIN',

      'SMALL_API_SMTP_CONFIG',

      'SMALL_API_DATABASE_URL',
      'SMALL_API_DATABASE_DB',
    ];

    for (const val of expectedValues) {
      if (!process.env[val]) {
        console.log(`Env var ${val} is not set`);
        process.exit(1);
        return false;
      }
    }

    return true;
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

      const port = process.env.SMALL_API_PORT;
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
