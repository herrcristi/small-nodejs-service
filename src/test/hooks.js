/**
 * Called by mocha
 */
const TestUtils = require('../core/utils/test.utils.js');

// setup env
TestUtils.setupEnv();

/**
 * global hooks for mocha
 */
exports.mochaHooks = {
  /**
   * before all
   */
  beforeAll: [
    async function () {
      this.timeout(20 * 1000);

      // init
      await TestUtils.init();
    },

    function (done) {
      // init service
      const service = require('../index.js');
      service.on('inited', () => {
        done();
      });
    },
  ],

  /**
   * before each
   */
  beforeEach: [async function () {}],

  /**
   * after each
   */
  afterEach: [async function () {}],

  /**
   * after all
   */
  afterAll: [
    async function () {
      // uninit
      await TestUtils.uninit();
    },
  ],
};
