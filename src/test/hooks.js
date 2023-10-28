/**
 * Called by mocha
 */
const sinon = require('sinon');

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
      console.log('current env TEST_DB', process.env.TEST_DB);

      // init service
      const service = require('../index.js');
      const DBMgr = require('../core/utils/database-manager.utils.js');

      if (!process.env.TEST_DB) {
        sinon.stub(DBMgr, 'connect').callsFake((dbUrl, dbName) => {
          console.log(`Mock db connection to ${dbUrl} ${dbName}`);
          return { collection: () => null };
        });
      }

      const fnDone = () => {
        service.event.off('inited', fnDone);
        done();
      };
      service.event.on('inited', fnDone);
    },

    async () => {
      sinon.restore();
    },
  ],

  /**
   * before each
   */
  beforeEach: [async function () {}],

  /**
   * after each
   */
  afterEach: [
    async function () {
      console.log('---------------------\n');
    },
  ],

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
