const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const JwtUtils = require('../../../core/utils/jwt.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const UsersLocalAuthService = require('../../../services/users-auth/users-local-auth.service.js');
const UsersAuthSessionsService = require('../../../services/users-auth/users-auth.sessions.service.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {
    // a new session record at every login (the sessions service has its own tests)
    const session = { id: 'session-id1', secret: 'secret1', expiresAt: new Date(Date.now() + 60 * 1000) };
    sinon.stub(UsersAuthSessionsService, 'create').resolves({ status: 201, value: session });
  });

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
          objTarget: { id: testAuthUser.userID, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          objArg: { id: testAuthUser.userID, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          severity: undefined, // default info
        });
        return { status: 200, value: {} };
      });

    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubUsersActive = sinon.stub(UsersRest, 'activate').callsFake((objID) => {
      console.log(`\nUsersRest.activate called for ${objID}\n`);

      chai.expect(objID).to.equal(testInfoUser.id);
      return { status: 200, value: { id: objID } };
    });

    let stubSchoolsActive = sinon.stub(SchoolsRest, 'activate').callsFake((objID) => {
      console.log(`\nSchoolsRest.activate called for ${objID}\n`);

      chai.expect(objID).to.be.oneOf(testInfoUser.schools.map((item) => item.id));
      return { status: 200, value: { id: objID } };
    });

    let stubToken = sinon.stub(JwtUtils, 'getJwt').callsFake((data) => {
      console.log(`\nJwtUtils.getJwt called for ${JSON.stringify(data, null, 2)}\n`);

      chai.expect(data.creatingTimestamp).to.exists;
      chai
        .expect(_.omit(data, 'creatingTimestamp'))
        .to.deep.equal({ purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' });
      return { status: 200, value: 'token' };
    });

    let stubEncrypt = sinon.stub(JwtUtils, 'encrypt').callsFake((data) => {
      console.log(`\nJwtUtils.encrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    let res = await UsersAuthService.login({ username: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubUsersActive.callCount).to.equal(0);
    chai.expect(stubSchoolsActive.callCount).to.equal(0);
    chai.expect(stubEvents.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubEncrypt.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        userID: testInfoUser.id,
        username: testInfoUser.email,
        status: testInfoUser.status,
        name: testInfoUser.name,
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
          objTarget: { id: testAuthUser.userID, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          objArg: { id: testAuthUser.userID, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          severity: undefined, // default info
        });
        return { status: 200, value: {} };
      });

    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubUsersActive = sinon.stub(UsersRest, 'activate').callsFake((objID) => {
      console.log(`\nUsersRest.activate called for ${objID}\n`);

      chai.expect(objID).to.equal(testInfoUser.id);
      return { status: 200, value: { id: objID } };
    });

    let stubSchoolsActive = sinon.stub(SchoolsRest, 'activate').callsFake((objID) => {
      console.log(`\nSchoolsRest.activate called for ${objID}\n`);

      chai.expect(objID).to.be.oneOf(testInfoUser.schools.map((item) => item.id));
      return { status: 200, value: { id: objID } };
    });

    let stubToken = sinon.stub(JwtUtils, 'getJwt').callsFake((data) => {
      console.log(`\nJwtUtils.getJwt called for ${JSON.stringify(data, null, 2)}\n`);

      chai.expect(data.creatingTimestamp).to.exists;
      chai.expect(_.omit(data, 'creatingTimestamp')).to.deep.equal({
        purpose: 'session',
        userID: testAuthUser.userID,
        username: testInfoUser.email,
        secret: 'secret1',
      });
      return { status: 200, value: 'token' };
    });

    let stubEncrypt = sinon.stub(JwtUtils, 'encrypt').callsFake((data) => {
      console.log(`\nJwtUtils.encrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    let res = await UsersAuthService.login({ username: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubUsersActive.callCount).to.equal(1);
    chai.expect(stubSchoolsActive.callCount).to.equal(2);
    chai.expect(stubEvents.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubEncrypt.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        userID: testInfoUser.id,
        username: testInfoUser.email,
        status: testInfoUser.status,
        name: testInfoUser.name,
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
    let res = await UsersAuthService.login({ username: testAuthUser.id }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(0);
    // the real error (the controller answers 401)
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
    let res = await UsersAuthService.login({ username: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(0); // a failed login is only logged, not recorded as an event

    // the real error (the controller answers the same 401 for every failed login)
    chai.expect(res.status).to.equal(404);
    chai.expect(res.error.message).to.equal('Test error message');
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
    let res = await UsersAuthService.login({ username: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(0); // a failed login is only logged, not recorded as an event

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
            reason: 'No user details',
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
    let res = await UsersAuthService.login({ username: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsers.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(0); // a failed login is only logged, not recorded as an event

    // the real error (the controller answers the same 401 for every failed login)
    chai.expect(res.status).to.equal(404);
    chai.expect(res.error.message).to.equal('Test error message');
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
          objTarget: { id: testAuthUser.userID, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          objArg: {
            id: testAuthUser.userID,
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
    let res = await UsersAuthService.login({ username: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsers.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(0); // a failed login is only logged, not recorded as an event

    // the real error (the controller answers the same 401 for every failed login)
    chai.expect(res).to.deep.equal({
      status: 403,
      error: { message: 'User is disabled', error: new Error('User is disabled') },
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

    let stubUsersActive = sinon.stub(UsersRest, 'activate').callsFake((objID) => {
      console.log(`\nUsersRest.activate called for ${objID}\n`);

      chai.expect(objID).to.equal(testInfoUser.id);
      return { status: 404, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.login({ username: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
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
   * login fail when the user was disabled while the login runs
   */
  it('should login fail when the user was disabled while the login runs', async () => {
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

    let stubUsersActive = sinon.stub(UsersRest, 'activate').callsFake((objID) => {
      console.log(`\nUsersRest.activate called for ${objID}\n`);

      chai.expect(objID).to.equal(testInfoUser.id);
      // not changed: somebody disabled the user, the answer has the current status
      return { status: 200, value: { id: objID, status: 'disabled' }, changed: false };
    });

    // call
    let res = await UsersAuthService.login({ username: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubUsersActive.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(0); // a failed login is only logged, not recorded as an event
    // the real error (the controller answers the same 401 for every failed login)
    chai.expect(res).to.deep.equal({
      status: 403,
      error: { message: 'User is disabled', error: new Error('User is disabled') },
    });
  }).timeout(10000);

  /**
   * login when a pending school can not be made active: the login goes on (one broken school does not lock the user
   * out), the school stays pending and is tried again at the next session refresh
   */
  it('should login when a pending school can not be made active', async () => {
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

    let stubSchoolsActive = sinon.stub(SchoolsRest, 'activate').callsFake((objID) => {
      console.log(`\nSchoolsRest.activate called for ${objID}\n`);

      chai.expect(objID).to.be.oneOf(testInfoUser.schools.map((item) => item.id));
      return { status: 404, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.login({ username: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: logged in, every pending school was tried and stays pending
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubSchoolsActive.callCount).to.equal(testInfoUser.schools.length);
    chai.expect(res.status).to.equal(200);
    chai.expect(testInfoUser.schools.every((school) => school.status === 'pending')).to.equal(true);
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
      chai.expect(_.omit(data, 'creatingTimestamp')).to.deep.equal({
        purpose: 'session',
        userID: testAuthUser.userID,
        username: testAuthUser.id,
        secret: 'secret1',
      });
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.login({ username: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
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
