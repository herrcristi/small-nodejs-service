const TestConstants = require('./test-constants.js');

const Private = {
  /**
   * the settings of the service in the environment (all of them start with these prefixes)
   */
  ServiceEnvPrefixes: ['SMALL_API_', 'SMALL_UI_'],
};

/**
 * Test utils
 */
const Public = {
  /**
   * setup env
   * the tests do not depend on the environment of the shell: every setting of the service is removed first, then the
   * test values are set; a test that needs another value (or no value) changes it and restores it afterwards
   */
  setupEnv: () => {
    for (const name of Object.keys(process.env)) {
      const isServiceSetting = Private.ServiceEnvPrefixes.some((prefix) => name.startsWith(prefix));
      if (isServiceSetting) {
        delete process.env[name];
      }
    }

    // env
    process.env.NODE_ENV = 'test';
    process.env.SMALL_API_PORT = TestConstants.Port;
    process.env.SMALL_API_URL = TestConstants.WebServer;
    process.env.SMALL_UI_URL = TestConstants.WebServer1; // the links of the emails

    process.env.SMALL_API_AUTH_PROVIDER_TYPE = TestConstants.Auth.AuthProviderType;
    process.env.SMALL_API_SALT = TestConstants.Auth.Salt;
    process.env.SMALL_API_S2SPASS = TestConstants.Auth.S2SPass;
    process.env.SMALL_API_PREVAUTHPASS = TestConstants.Auth.PrevAuthPass;
    process.env.SMALL_API_AUTHPASS = TestConstants.Auth.AuthPass;
    process.env.SMALL_API_SMTP_CONFIG = TestConstants.Auth.SmtpConfig;

    process.env.SMALL_API_CORS_ORIGIN = TestConstants.WebServer + ',' + TestConstants.WebServer1;

    process.env.SMALL_API_DATABASE_URL = TestConstants.Database.Url;
    process.env.SMALL_API_DATABASE_DB = TestConstants.Database.Db;
    process.env.SMALL_API_PORTAL_SCHOOL_ID = TestConstants.PortalSchoolID;
    process.env.SMALL_API_INTERNAL_ROUTES = 'true'; // the tests call the internal routes

    console.log('\nprocess.env.NODE_ENV:', process.env.NODE_ENV);
    console.log('\nprocess.env.SMALL_API_PORT:', process.env.SMALL_API_PORT);
    console.log('\nprocess.env.SMALL_API_URL:', process.env.SMALL_API_URL);

    console.log('\nprocess.env.SMALL_API_AUTH_PROVIDER_TYPE:', process.env.SMALL_API_AUTH_PROVIDER_TYPE);
    console.log('\nprocess.env.SMALL_API_SALT:', process.env.SMALL_API_SALT);
    console.log('\nprocess.env.SMALL_API_S2SPASS:', process.env.SMALL_API_S2SPASS);
    console.log('\nprocess.env.SMALL_API_PREVAUTHPASS:', process.env.SMALL_API_PREVAUTHPASS);
    console.log('\nprocess.env.SMALL_API_AUTHPASS:', process.env.SMALL_API_AUTHPASS);
    console.log('\nprocess.env.SMALL_API_SMTP_CONFIG:', process.env.SMALL_API_SMTP_CONFIG);

    console.log('\nprocess.env.SMALL_API_CORS_ORIGIN:', process.env.SMALL_API_CORS_ORIGIN);

    console.log('\nprocess.env.SMALL_API_DATABASE_URL:', process.env.SMALL_API_DATABASE_URL);
    console.log('\nprocess.env.SMALL_API_DATABASE_DB:', process.env.SMALL_API_DATABASE_DB);
  },

  /**
   * init
   */
  init: async () => {
    console.log('\nInit test framework\n');
  },

  /**
   * uninit
   */
  uninit: async () => {
    console.log('\nCleanup test framework\n');
  },
};

module.exports = { ...Public };
