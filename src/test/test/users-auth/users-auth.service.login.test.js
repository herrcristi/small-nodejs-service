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
   * login with success
   */
  it('should login with success', async () => {
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
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called for ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 200, value: { ...testAuthUser } };
    });

    let stubEvents = sinon
      .stub(EventsRest, 'raiseEventForObject')
      .callsFake((serviceName, action, objTarget, objArg, ctx, severity) => {
        console.log(
          `\nEventsRest.raiseEventForObject called for ${JSON.stringify(
            { serviceName, action, objTarget, objArg, severity },
            null,
            2
          )}\n`
        );
        chai.expect({ serviceName, action, objTarget, objArg, severity }).to.deep.equal({
          serviceName: UsersAuthService.Constants.ServiceName,
          action: 'login',
          objTarget: { id: testAuthUser.id, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          objArg: { id: testAuthUser.id, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          severity: undefined, // default info
        });
        return { status: 200, value: {} };
      });

    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubUsersActive = sinon.stub(UsersRest, 'put').callsFake((objID, objInfo) => {
      console.log(`\nUsersRest.put called for ${JSON.stringify({ objID, objInfo }, null, 2)}\n`);

      chai.expect(objID).to.equal(testInfoUser.id);
      chai.expect(objInfo).to.deep.equal({ status: 'active' });
      return { status: 200, value: { id: objID } };
    });

    let stubSchoolsActive = sinon.stub(SchoolsRest, 'put').callsFake((objID, objInfo) => {
      console.log(`\nSchoolsRest.put called for ${JSON.stringify({ objID, objInfo }, null, 2)}\n`);

      chai.expect(objID).to.be.oneOf(testInfoUser.schools.map((item) => item.id));
      chai.expect(objInfo).to.deep.equal({ status: 'active' });
      return { status: 200, value: { id: objID } };
    });

    let stubToken = sinon.stub(JwtUtils, 'getJwt').callsFake((data) => {
      console.log(`\nJwtUtils.getJwt called for ${JSON.stringify(data, null, 2)}\n`);

      chai.expect(data.creatingTimestamp).to.exists;
      chai.expect(_.omit(data, 'creatingTimestamp')).to.deep.equal({ id: testAuthUser.id, userID: testInfoUser.id });
      return { status: 200, value: 'token' };
    });

    // call
    let res = await UsersAuthService.login({ id: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubUsersActive.callCount).to.equal(0);
    chai.expect(stubSchoolsActive.callCount).to.equal(0);
    chai.expect(stubEvents.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testInfoUser.id,
        status: testInfoUser.status,
        email: testInfoUser.email,
        schools: testInfoUser.schools,
      },
      token: 'token',
    });
  }).timeout(10000);

  /**
   * login with success and make active
   */
  it('should login with success and make active', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    testInfoUser.status = UsersRest.Constants.Status.Pending;
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Pending;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called for ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 200, value: { ...testAuthUser } };
    });

    let stubEvents = sinon
      .stub(EventsRest, 'raiseEventForObject')
      .callsFake((serviceName, action, objTarget, objArg, ctx, severity) => {
        console.log(
          `\nEventsRest.raiseEventForObject called for ${JSON.stringify(
            { serviceName, action, objTarget, objArg, severity },
            null,
            2
          )}\n`
        );
        chai.expect({ serviceName, action, objTarget, objArg, severity }).to.deep.equal({
          serviceName: UsersAuthService.Constants.ServiceName,
          action: 'login',
          objTarget: { id: testAuthUser.id, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          objArg: { id: testAuthUser.id, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          severity: undefined, // default info
        });
        return { status: 200, value: {} };
      });

    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubUsersActive = sinon.stub(UsersRest, 'put').callsFake((objID, objInfo) => {
      console.log(`\nUsersRest.put called for ${JSON.stringify({ objID, objInfo }, null, 2)}\n`);

      chai.expect(objID).to.equal(testInfoUser.id);
      chai.expect(objInfo).to.deep.equal({ status: 'active' });
      return { status: 200, value: { id: objID } };
    });

    let stubSchoolsActive = sinon.stub(SchoolsRest, 'put').callsFake((objID, objInfo) => {
      console.log(`\nSchoolsRest.put called for ${JSON.stringify({ objID, objInfo }, null, 2)}\n`);

      chai.expect(objID).to.be.oneOf(testInfoUser.schools.map((item) => item.id));
      chai.expect(objInfo).to.deep.equal({ status: 'active' });
      return { status: 200, value: { id: objID } };
    });

    let stubToken = sinon.stub(JwtUtils, 'getJwt').callsFake((data) => {
      console.log(`\nJwtUtils.getJwt called for ${JSON.stringify(data, null, 2)}\n`);

      chai.expect(data.creatingTimestamp).to.exists;
      chai.expect(_.omit(data, 'creatingTimestamp')).to.deep.equal({ id: testAuthUser.id, userID: testInfoUser.id });
      return { status: 200, value: 'token' };
    });

    // call
    let res = await UsersAuthService.login({ id: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubUsersActive.callCount).to.equal(1);
    chai.expect(stubSchoolsActive.callCount).to.equal(2);
    chai.expect(stubEvents.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testInfoUser.id,
        status: testInfoUser.status,
        email: testInfoUser.email,
        schools: testInfoUser.schools,
      },
      token: 'token',
    });
  }).timeout(10000);

  /**
   * login fail validation
   */
  it('should login fail validation', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called for ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 200, value: { ...testAuthUser } };
    });

    // call
    let res = await UsersAuthService.login({ id: testAuthUser.id }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Failed to validate schema. Error: "password" is required',
        error: new Error('Failed to validate schema. Error: "password" is required'),
      },
    });
  }).timeout(10000);

  /**
   * login fail get user
   */
  it('should login fail get user', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called for ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 404, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    let stubEvents = sinon
      .stub(EventsRest, 'raiseEventForObject')
      .callsFake((serviceName, action, objTarget, objArg, ctx, severity) => {
        console.log(
          `\nEventsRest.raiseEventForObject called for ${JSON.stringify(
            { serviceName, action, objTarget, objArg, severity },
            null,
            2
          )}\n`
        );
        chai.expect({ serviceName, action, objTarget, objArg, severity }).to.deep.equal({
          serviceName: UsersAuthService.Constants.ServiceName,
          action: 'login.failed',
          objTarget: { id: testAuthUser.id, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          objArg: {
            id: testAuthUser.id,
            name: testAuthUser.id,
            type: UsersAuthService.Constants.Type,
            reason: 'Login failed',
          },
          severity: EventsRest.Constants.Severity.Warning,
        });
        return { status: 200, value: {} };
      });

    // call
    let res = await UsersAuthService.login({ id: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Invalid username/password',
        error: new Error('Invalid username/password'),
      },
    });
  }).timeout(10000);

  /**
   * login fail different password
   */
  it('should login fail different password', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called for ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 200, value: { ...testAuthUser, password: 'otherpass' } };
    });

    let stubEvents = sinon
      .stub(EventsRest, 'raiseEventForObject')
      .callsFake((serviceName, action, objTarget, objArg, ctx, severity) => {
        console.log(
          `\nEventsRest.raiseEventForObject called for ${JSON.stringify(
            { serviceName, action, objTarget, objArg, severity },
            null,
            2
          )}\n`
        );
        chai.expect({ serviceName, action, objTarget, objArg, severity }).to.deep.equal({
          serviceName: UsersAuthService.Constants.ServiceName,
          action: 'login.failed',
          objTarget: { id: testAuthUser.id, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          objArg: {
            id: testAuthUser.id,
            name: testAuthUser.id,
            type: UsersAuthService.Constants.Type,
            reason: 'Login failed',
          },
          severity: EventsRest.Constants.Severity.Warning,
        });
        return { status: 200, value: {} };
      });

    // call
    let res = await UsersAuthService.login({ id: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Invalid username/password',
        error: new Error('Invalid username/password'),
      },
    });
  }).timeout(10000);

  /**
   * login fail to get user by email
   */
  it('should login fail to get user by email', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called for ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 200, value: { ...testAuthUser } };
    });

    let stubEvents = sinon
      .stub(EventsRest, 'raiseEventForObject')
      .callsFake((serviceName, action, objTarget, objArg, ctx, severity) => {
        console.log(
          `\nEventsRest.raiseEventForObject called for ${JSON.stringify(
            { serviceName, action, objTarget, objArg, severity },
            null,
            2
          )}\n`
        );
        chai.expect({ serviceName, action, objTarget, objArg, severity }).to.deep.equal({
          serviceName: UsersAuthService.Constants.ServiceName,
          action: 'login.failed',
          objTarget: { id: testAuthUser.id, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          objArg: {
            id: testAuthUser.id,
            name: testAuthUser.id,
            type: UsersAuthService.Constants.Type,
            reason: 'No user',
          },
          severity: 'warning',
        });
        return { status: 200, value: {} };
      });

    let stubUsers = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 404, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.login({ id: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsers.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Invalid username/password',
        error: new Error('Invalid username/password'),
      },
    });
  }).timeout(10000);

  /**
   * login fail user has status disabled
   */
  it('should login fail user has status disabled', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called for ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 200, value: { ...testAuthUser } };
    });

    let stubEvents = sinon
      .stub(EventsRest, 'raiseEventForObject')
      .callsFake((serviceName, action, objTarget, objArg, ctx, severity) => {
        console.log(
          `\nEventsRest.raiseEventForObject called for ${JSON.stringify(
            { serviceName, action, objTarget, objArg, severity },
            null,
            2
          )}\n`
        );
        chai.expect({ serviceName, action, objTarget, objArg, severity }).to.deep.equal({
          serviceName: UsersAuthService.Constants.ServiceName,
          action: 'login.failed',
          objTarget: { id: testAuthUser.id, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          objArg: {
            id: testAuthUser.id,
            name: testAuthUser.id,
            type: UsersAuthService.Constants.Type,
            reason: 'User is disabled',
          },
          severity: 'warning',
        });
        return { status: 200, value: {} };
      });

    let stubUsers = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: { ...testInfoUser, status: UsersRest.Constants.Status.Disabled } };
    });

    // call
    let res = await UsersAuthService.login({ id: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsers.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Invalid username/password',
        error: new Error('Invalid username/password'),
      },
    });
  }).timeout(10000);

  /**
   * login fail to make user active
   */
  it('should login fail to make user active', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    testInfoUser.status = UsersRest.Constants.Status.Pending;
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Pending;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called for ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 200, value: { ...testAuthUser } };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject');

    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubUsersActive = sinon.stub(UsersRest, 'put').callsFake((objID, objInfo) => {
      console.log(`\nUsersRest.put called for ${JSON.stringify({ objID, objInfo }, null, 2)}\n`);

      chai.expect(objID).to.equal(testInfoUser.id);
      chai.expect(objInfo).to.deep.equal({ status: 'active' });
      return { status: 404, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.login({ id: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubUsersActive.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Failed to make user active',
        error: new Error('Failed to make user active'),
      },
    });
  }).timeout(10000);

  /**
   * login fail to make school active
   */
  it('should login fail to make school active', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];

    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Pending;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called for ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 200, value: { ...testAuthUser } };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject');

    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubSchoolsActive = sinon.stub(SchoolsRest, 'put').callsFake((objID, objInfo) => {
      console.log(`\nSchoolsRest.put called for ${JSON.stringify({ objID, objInfo }, null, 2)}\n`);

      chai.expect(objID).to.be.oneOf(testInfoUser.schools.map((item) => item.id));
      chai.expect(objInfo).to.deep.equal({ status: 'active' });
      return { status: 404, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.login({ id: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubSchoolsActive.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Failed to make school active',
        error: new Error('Failed to make school active'),
      },
    });
  }).timeout(10000);

  /**
   * login fail to get token
   */
  it('should login fail to get token', async () => {
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
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called for ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 200, value: { ...testAuthUser } };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject');

    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubToken = sinon.stub(JwtUtils, 'getJwt').callsFake((data) => {
      console.log(`\nJwtUtils.getJwt called for ${JSON.stringify(data, null, 2)}\n`);

      chai.expect(data.creatingTimestamp).to.exists;
      chai.expect(_.omit(data, 'creatingTimestamp')).to.deep.equal({ id: testAuthUser.id, userID: testInfoUser.id });
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.login({ id: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(0);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Failed to get token',
        error: new Error('Failed to get token'),
      },
    });
  }).timeout(10000);
});
