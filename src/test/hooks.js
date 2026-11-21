/**
 * Called by mocha
 */
const sinon = require('sinon');
const mailer = require('nodemailer');

const TestUtils = require('./test-setup.utils.js');

// setup env
TestUtils.setupEnv();

// the stubs of the start of the service: set before any test file is loaded, because the service starts when index.js
// is loaded first (by a test file or below), and the tests never connect to a database or a mail server of the
// machine (the functional tests, IS_TEST_DB, use the database); they are removed after the start (sinon.restore)
if (!process.env.IS_TEST_DB) {
  const DBMgr = require('../core/utils/database-manager.utils.js');
  sinon.stub(DBMgr, 'connect').callsFake((dbUrl, dbName) => {
    console.log(`\nMock db connection to ${dbName}`);
    return { collection: () => null };
  });

  const SchoolsRest = require('../services/rest/schools.rest.js');
  sinon.stub(SchoolsRest, 'getOne').resolves({
    status: 200,
    value: {
      id: process.env.SMALL_API_PORTAL_SCHOOL_ID,
      name: 'Portal School',
      status: 'active',
    },
  });
}

// the functional tests (IS_TEST_DB) start with an empty test database (TestConstants.Database.Db): nothing left by an
// earlier run or an earlier version (data, or an index the code does not create anymore); it is dropped once, at the
// first connection of the start, before any collection is used
if (process.env.IS_TEST_DB) {
  const DBMgr = require('../core/utils/database-manager.utils.js');
  const connect = DBMgr.connect;
  let dropped = null;
  sinon.stub(DBMgr, 'connect').callsFake(async (dbUrl, dbName, _ctx) => {
    const database = await connect(dbUrl, dbName, _ctx);
    dropped ??= database.dropDatabase();
    await dropped;
    return database;
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

    async function () {
      this.timeout(20 * 1000);
      console.log('\ncurrent env IS_TEST_DB', process.env.IS_TEST_DB);

      // the service is started (when index.js was loaded first)
      const service = require('../index.js');
      await service.initialized;
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
