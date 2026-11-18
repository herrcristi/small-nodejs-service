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

const Private = {
  /**
   * the example values of the secrets (src/.env.example): never accepted in production
   */
  SecretPlaceholders: ['00001111222233334444555566667777', 'bccc'.repeat(16)],

  /**
   * problems of the secrets: placeholders, weak values (few different characters), or the service to service
   * password equal to an auth password (the same key would protect sessions and internal calls)
   */
  evaluateSecrets: () => {
    const problems = [];
    for (const name of ['SMALL_API_SALT', 'SMALL_API_S2SPASS', 'SMALL_API_PREVAUTHPASS', 'SMALL_API_AUTHPASS']) {
      const value = process.env[name];
      if (Private.SecretPlaceholders.includes(value) || new Set(value).size < 10) {
        problems.push(`Env var ${name} is a placeholder or a weak value (generate it, see .env.example)`);
      }
    }

    const s2sPass = process.env.SMALL_API_S2SPASS;
    if ([process.env.SMALL_API_AUTHPASS, process.env.SMALL_API_PREVAUTHPASS].includes(s2sPass)) {
      problems.push('Env var SMALL_API_S2SPASS must be different from SMALL_API_AUTHPASS and SMALL_API_PREVAUTHPASS');
    }
    return problems;
  },
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
      'SMALL_UI_URL',
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
      'SMALL_API_PORTAL_SCHOOL_ID',
    ];

    for (const val of expectedValues) {
      if (!process.env[val]) {
        console.log(`Env var ${val} is not set`);
        process.exit(1);
        return false;
      }
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        process.env.SMALL_API_PORTAL_SCHOOL_ID
      )
    ) {
      console.log('Env var SMALL_API_PORTAL_SCHOOL_ID must be a UUID');
      process.exit(1);
      return false;
    }

    // the secrets: refused in production, a warning in debug mode (local development with the example values)
    const problems = Private.evaluateSecrets();
    if (problems.length) {
      problems.forEach((problem) => console.log(problem));
      if (!CommonUtils.isDebug()) {
        process.exit(1);
        return false;
      }
      console.log('Debug mode: the secrets above are accepted only for local development');
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
        const stringsFile = path.resolve(__dirname, `translations/${lang}.json`);
        await TranslationsUtils.initStrings(lang, stringsFile);
        const emailsFile = path.resolve(__dirname, `translations/${lang}.emails.json`);
        await TranslationsUtils.initEmails(lang, emailsFile);
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
