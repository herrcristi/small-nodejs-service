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

    console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
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
