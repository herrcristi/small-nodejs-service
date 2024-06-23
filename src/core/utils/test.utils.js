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

    console.log('\nprocess.env.NODE_ENV:', process.env.NODE_ENV);
    console.log('\nprocess.env.PORT:', process.env.PORT);
    console.log('\nprocess.env.APP_URL:', process.env.APP_URL);
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
