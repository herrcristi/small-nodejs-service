const chai = require('chai');

const TestUtils = require('../../test-setup.utils.js');
const TestConstants = require('../../test-constants.js');

describe('Test Utils', function () {
  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {});

  after(async function () {});

  /**
   * the environment of the tests does not depend on the shell: it is reset completely, then the test values are set
   */
  it('should set the environment of the tests without the settings of the shell', async () => {
    // stub: values left by the shell, one of them a test value changed
    process.env.SMALL_API_PORTAL_ADMIN_EMAIL = 'john.smith@testdomain.test';
    process.env.SMALL_UI_THEME = 'dark';
    process.env.OTHER_TOOL_SETTING = 'on';
    process.env.SMALL_API_PORTAL_SCHOOL_ID = 'another-school';

    // call
    TestUtils.setupEnv();

    // check: removed, and the test values set again
    chai.expect(process.env.SMALL_API_PORTAL_ADMIN_EMAIL).to.equal(undefined);
    chai.expect(process.env.SMALL_UI_THEME).to.equal(undefined);
    chai.expect(process.env.OTHER_TOOL_SETTING).to.equal(undefined);
    chai.expect(process.env.SMALL_API_PORTAL_SCHOOL_ID).to.equal(TestConstants.PortalSchoolID);
    chai.expect(process.env.NODE_ENV).to.equal('test');
  }).timeout(10000);
});
