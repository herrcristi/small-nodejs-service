/**
 * Called by mocha
 */
const sinon = require('sinon');
const mailer = require('nodemailer');

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
      console.log('\ncurrent env TEST_DB', process.env.TEST_DB);

      // init service
      const DBMgr = require('../core/utils/database-manager.utils.js');

      if (!process.env.TEST_DB) {
        sinon.stub(DBMgr, 'connect').callsFake((dbUrl, dbName) => {
          console.log(`\nMock db connection to ${dbUrl} ${dbName}`);
          return { collection: () => null };
        });
      }

      // stub mailer
      sinon.stub(mailer, 'createTransport').returns({
        verify: async () => {
          return true;
        },
        sendEmail: async () => {
          return true;
        },
      });

      const service = require('../index.js');
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
      console.log('\n---------------------\n');
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
