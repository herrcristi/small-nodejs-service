/**
 * Test utils
 */
const Public = {
  /**
   * setup env
   */
  setupEnv: () => {
    //env
    process.env.NODE_ENV = 'test';
    process.env.PORT = 8080;
    process.env.APP_URL = 'http://localhost:8080';
    process.env.SALT = 'bcccbcccbcccbcccbcccbcccbcccbcccbcccbcccbcccbcccbcccbcccbcccbccc'; // 64 chars
    process.env.S2SPASS = '00001111222233334444555566667777'; // 32 characters
    process.env.USERS_AUTH_PROVIDER = 'local'; // for testing default is local (local / firebase)
    process.env.SMTP_CONFIG =
      '{ "host": "host", "port": "465", "user": "user", "password": "password", "from": "small@localhost" }';

    console.log('\nprocess.env.NODE_ENV:', process.env.NODE_ENV);
    console.log('\nprocess.env.PORT:', process.env.PORT);
    console.log('\nprocess.env.APP_URL:', process.env.APP_URL);
    console.log('\nprocess.env.SALT:', process.env.SALT);
    console.log('\nprocess.env.S2SPASS:', process.env.S2SPASS);
    console.log('\nprocess.env.USERS_AUTH_PROVIDER:', process.env.USERS_AUTH_PROVIDER);
    console.log('\nprocess.env.SMTP_CONFIG:', process.env.SMTP_CONFIG);
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
