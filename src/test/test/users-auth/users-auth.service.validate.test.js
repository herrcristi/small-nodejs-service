const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const JwtUtils = require('../../../core/utils/jwt.utils.js');

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
   * validate all route with success
   */
  it('should validate all route with success', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.name = school.id;
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

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        userID: testInfoUser.id,
        username: testAuthUser.id,
        tenantName: undefined,
      },
    });
  }).timeout(10000);

  /**
   * validate role school route with success
   */
  it('should validate role school route with success', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.name = school.id;
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

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[1].id; // where is admin
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/schools/${_ctx.tenantID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/schools/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        userID: testInfoUser.id,
        username: testAuthUser.id,
        tenantName: 'school-high2',
      },
    });
  }).timeout(10000);

  /**
   * validate role route with success
   */
  it('should validate role route with success', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.name = school.id;
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

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[1].id; // where is admin
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/students/${testInfoUser.id}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/students/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        userID: testInfoUser.id,
        username: testAuthUser.id,
        tenantName: 'school-high2',
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
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
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
   * validate fail decrypt token
   */
  it('should validate fail decrypt token', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.name = school.id;
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 401, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Test error message',
        error: new Error('Test error'),
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

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
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

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 404,
      error: {
        message: 'Test error message',
        error: new Error('Test error'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate user is disabled
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

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    // call
    _ctx.tenantID = 'schoolID';
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'User is disabled',
        error: new Error('User is disabled'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate user auth :id
   */
  it('should fail validate user auth :id', async () => {
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

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users-auth/diffid`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users-auth/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: ':id restriction applied',
        error: new Error(':id restriction applied'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate user-auth :id prefix
   */
  it('should fail validate user-auth :id prefix', async () => {
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

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users-auth/diffid/something`;
    let res = await UsersAuthService.validate(
      { token: 'token', method: 'get', route: '/api/v1/users-auth/:id/something' },
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: ':id restriction applied',
        error: new Error(':id restriction applied'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate user :id prefix
   */
  it('should fail validate user :id prefix', async () => {
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

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/diffid/something`;
    let res = await UsersAuthService.validate(
      { token: 'token', method: 'get', route: '/api/v1/users/:id/something' },
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: ':id restriction applied',
        error: new Error(':id restriction applied'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate school :id
   */
  it('should fail validate school :id', async () => {
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

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/schools/diffid`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/schools/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: ':id restriction applied',
        error: new Error(':id restriction applied'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate school :id prefix
   */
  it('should fail validate school :id prefix', async () => {
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

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/schools/diffid/something`;
    let res = await UsersAuthService.validate(
      { token: 'token', method: 'get', route: '/api/v1/schools/:id/something' },
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: ':id restriction applied',
        error: new Error(':id restriction applied'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate school
   */
  it('should fail validate school', async () => {
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

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    // call
    _ctx.tenantID = 'schoolID';
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/schools/${_ctx.tenantID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/schools/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Failed to validate school',
        error: new Error('Failed to validate school'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate school is disabled
   */
  it('should fail school is disabled', async () => {
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

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/schools/${_ctx.tenantID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/schools/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'School is disabled',
        error: new Error('School is disabled'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate route is not accesible
   */
  it('should fail route is not accesible', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 200, value: { id: testAuthUser.id, userID: testInfoUser.id } };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'invalid', route: '/api/v1/users/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Route is not accesible: invalid /api/v1/users/:id',
        error: new Error('Route is not accesible: invalid /api/v1/users/:id'),
      },
    });
  }).timeout(10000);
});
