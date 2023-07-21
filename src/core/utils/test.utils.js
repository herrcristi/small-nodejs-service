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

    console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
    console.log('process.env.PORT:', process.env.PORT);
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
