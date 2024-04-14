const _ = require('lodash');
const jwt = require('jsonwebtoken');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const UsersLocalAuthService = require('../../../services/users-auth/users-local-auth.service.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * validate with success
   */
  it('should validate with success', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    // generate a valid token
    const config = { serviceName: 'test' };
    const rT = await UsersLocalAuthService.getToken(config, { id: testAuthUser.id, userID: testInfoUser.id }, _ctx);
    console.log(`\nGenerate token: ${JSON.stringify(rT)}\n`);

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    let res = await UsersAuthService.validate({ token: rT.value }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        userID: testInfoUser.id,
        username: testAuthUser.id,
      },
    });
  }).timeout(10000);

  /**
   * validate fail validation
   */
  it('should validate fail validation', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // call
    let res = await UsersAuthService.validate({ id: testAuthUser.id }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Failed to validate schema. Error: "token" is required',
        error: new Error('Failed to validate schema. Error: "token" is required'),
      },
    });
  }).timeout(10000);

  /**
   * validate fail validate token
   */
  it('should validate fail validate token', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    let res = await UsersAuthService.validate({ token: 'token' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Failed to validate token',
        error: new Error('Failed to validate token'),
      },
    });
  }).timeout(10000);

  /**
   * validate fail get user
   */
  it('should validate fail get user', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 404, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // generate a valid token
    const config = { serviceName: 'test' };
    const rT = await UsersLocalAuthService.getToken(config, { id: testAuthUser.id, userID: testInfoUser.id }, _ctx);
    console.log(`\nGenerate token: ${JSON.stringify(rT)}\n`);

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    let res = await UsersAuthService.validate({ token: rT.value }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 404,
      error: {
        message: 'Test error message',
        error: new Error('Test error'),
      },
    });
  }).timeout(10000);

  /**
   * validate fail user is disabled
   */
  it('should validate fail user is disabled', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    testInfoUser.status = UsersRest.Constants.Status.Disabled;
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    // generate a valid token
    const config = { serviceName: 'test' };
    const rT = await UsersLocalAuthService.getToken(config, { id: testAuthUser.id, userID: testInfoUser.id }, _ctx);
    console.log(`\nGenerate token: ${JSON.stringify(rT)}\n`);

    // call
    _ctx.tenantID = 'schoolID';
    let res = await UsersAuthService.validate({ token: rT.value }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'User is disabled',
        error: new Error('User is disabled'),
      },
    });
  }).timeout(10000);

  /**
   * validate fail validate school
   */
  it('should validate fail validate school', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    // generate a valid token
    const config = { serviceName: 'test' };
    const rT = await UsersLocalAuthService.getToken(config, { id: testAuthUser.id, userID: testInfoUser.id }, _ctx);
    console.log(`\nGenerate token: ${JSON.stringify(rT)}\n`);

    // call
    _ctx.tenantID = 'schoolID';
    let res = await UsersAuthService.validate({ token: rT.value }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Failed to validate school',
        error: new Error('Failed to validate school'),
      },
    });
  }).timeout(10000);

  /**
   * validate fail school is disabled
   */
  it('should validate fail school is disabled', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Disabled;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    // generate a valid token
    const config = { serviceName: 'test' };
    const rT = await UsersLocalAuthService.getToken(config, { id: testAuthUser.id, userID: testInfoUser.id }, _ctx);
    console.log(`\nGenerate token: ${JSON.stringify(rT)}\n`);

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    let res = await UsersAuthService.validate({ token: rT.value }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'School is disabled',
        error: new Error('School is disabled'),
      },
    });
  }).timeout(10000);
});
