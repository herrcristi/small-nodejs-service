const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');
const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * patchID with success
   */
  it('should patchID with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const patchReq = {
      set: {
        id: testUser.id + '1',
        password: testUser._test_data.origPassword,
      },
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, objInfo) => {
      console.log(`\nDbOpsUtils.put called ${JSON.stringify({ objID, objInfo }, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubUserDetails = sinon.stub(UsersRest, 'putEmail').callsFake((objID, objInfo) => {
      console.log(`\nUsersRest.putEmail called ${JSON.stringify({ objID, objInfo }, null, 2)}\n`);
      return { status: 200, value: { ...testUser } };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubUsersAuthRest = sinon.stub(UsersAuthRest, 'raiseNotification').callsFake(() => {
      console.log(`\nUsersAuthRest raiseNotification called`);
    });

    // call
    let res = await UsersAuthService.patchID(testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUserDetails.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubUsersAuthRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: patchReq.set.id,
        oldID: testUser.id,
        name: patchReq.set.id,
        type: testUser.type,
      },
    });
  }).timeout(10000);

  /**
   * patchID fail validation
   */
  it('should patchID fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const patchReq = {
      set: {
        id: testUser.id + '1',
        password: testUser._test_data.origPassword,
        other: 1,
      },
    };

    // call
    let res = await UsersAuthService.patchID(testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "set.other" is not allowed');
  }).timeout(10000);

  /**
   * patchID fail same id email
   */
  it('should patchID fail same id email', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const patchReq = {
      set: {
        id: testUser.id,
        password: testUser._test_data.origPassword,
      },
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    // call
    let res = await UsersAuthService.patchID(testUser.id, patchReq, { ..._ctx, username: testUser.id });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'New id email is the same as current one',
        error: new Error('New id email is the same as current one'),
      },
    });
  }).timeout(10000);

  /**
   * patchID fail get
   */
  it('should patchID fail get', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const patchReq = {
      set: {
        id: testUser.id + '1',
        password: testUser._test_data.origPassword,
      },
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return {
        status: 500,
        error: { message: 'Test error message', error: new Error('Test error') },
      };
    });

    // call
    let res = await UsersAuthService.patchID(testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error') },
    });
  }).timeout(10000);

  /**
   * patchID fail wrong password
   */
  it('should patchID fail wrong password', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const patchReq = {
      set: {
        id: testUser.id + '1',
        password: testUser._test_data.origPassword + '1',
      },
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    // call
    let res = await UsersAuthService.patchID(testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 401,
      error: { message: 'Invalid username/password', error: new Error('Invalid username/password') },
    });
  }).timeout(10000);

  /**
   * patchID fail patch
   */
  it('should patchID fail patch', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const patchReq = {
      set: {
        id: testUser.id + '1',
        password: testUser._test_data.origPassword,
      },
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, objInfo) => {
      console.log(`\nDbOpsUtils.put called ${JSON.stringify({ objID, objInfo }, null, 2)}`);
      return {
        status: 500,
        error: { message: 'Test error message', error: new Error('Test error') },
      };
    });

    // call
    let res = await UsersAuthService.patchID(testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error') },
    });
  }).timeout(10000);

  /**
   * patchID fail user details putEmail
   */
  it('should patchID fail user details putEmail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const patchReq = {
      set: {
        id: testUser.id + '1',
        password: testUser._test_data.origPassword,
      },
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, objInfo) => {
      console.log(`\nDbOpsUtils.put called ${JSON.stringify({ objID, objInfo }, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubUserDetails = sinon.stub(UsersRest, 'putEmail').callsFake((objID, objInfo) => {
      console.log(`\nUsersRest.putEmail called ${JSON.stringify({ objID, objInfo }, null, 2)}\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.patchID(testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(2);
    chai.expect(stubBase.callCount).to.equal(2);
    chai.expect(stubUserDetails.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error') },
    });
  }).timeout(10000);
});
