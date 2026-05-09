const TestConstants = require('../../test/test-constants.js');

/**
 * Test utils
 */
const Public = {
  /**
   * setup env
   */
  setupEnv: () => {
    // env
    process.env.NODE_ENV = 'test';
    process.env.SMALL_PORT = TestConstants.Port;
    process.env.SMALL_API_URL = TestConstants.WebServer;

    process.env.SMALL_AUTH_PROVIDER_TYPE = TestConstants.Auth.AuthProviderType;
    process.env.SMALL_SALT = TestConstants.Auth.Salt;
    process.env.SMALL_S2SPASS = TestConstants.Auth.S2SPass;
    process.env.SMALL_PREVAUTHPASS = TestConstants.Auth.PrevAuthPass;
    process.env.SMALL_AUTHPASS = TestConstants.Auth.AuthPass;
    process.env.SMALL_SMTP_CONFIG = TestConstants.Auth.SmtpConfig;

    process.env.SMALL_DATABASE_URL = TestConstants.Database.Url;
    process.env.SMALL_DATABASE_DB = TestConstants.Database.Db;

    console.log('\nprocess.env.NODE_ENV:', process.env.NODE_ENV);
    console.log('\nprocess.env.SMALL_PORT:', process.env.SMALL_PORT);
    console.log('\nprocess.env.SMALL_API_URL:', process.env.SMALL_API_URL);

    console.log('\nprocess.env.SMALL_AUTH_PROVIDER_TYPE:', process.env.SMALL_AUTH_PROVIDER_TYPE);
    console.log('\nprocess.env.SMALL_SALT:', process.env.SMALL_SALT);
    console.log('\nprocess.env.SMALL_S2SPASS:', process.env.SMALL_S2SPASS);
    console.log('\nprocess.env.SMALL_PREVAUTHPASS:', process.env.SMALL_PREVAUTHPASS);
    console.log('\nprocess.env.SMALL_AUTHPASS:', process.env.SMALL_AUTHPASS);
    console.log('\nprocess.env.SMALL_SMTP_CONFIG:', process.env.SMALL_SMTP_CONFIG);

    console.log('\nprocess.env.SMALL_DATABASE_URL:', process.env.SMALL_DATABASE_URL);
    console.log('\nprocess.env.SMALL_DATABASE_DB:', process.env.SMALL_DATABASE_DB);
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
