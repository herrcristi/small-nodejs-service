const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
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
   * putID with success
   */
  it('should putID with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const putReq = {
      id: testUser.id + '1',
      password: testUser._test_data.origPassword,
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchInfo) => {
      console.log(`\nDbOpsUtils.patch called ${JSON.stringify({ objID, patchInfo }, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubUserDetails = sinon.stub(UsersRest, 'putEmail').callsFake((objID, objInfo) => {
      console.log(`\nUsersRest.putEmail called ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 200, value: { id: objID } };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubUsersAuthRest = sinon.stub(UsersAuthRest, 'raiseNotification').callsFake((notificationType, objs) => {
      console.log(`\nUsersAuthRest raiseNotification called`);
      console.log(`\nNotificationType: ${JSON.stringify(notificationType, null, 2)}`);
      console.log(`\nNotifications: ${JSON.stringify(objs, null, 2)}`);

      chai.expect(notificationType).to.equal(NotificationsUtils.Constants.Notification.Modified);
      chai.expect(objs).to.deep.equal([
        {
          id: testUser.id,
          name: testUser.id,
          type: UsersAuthConstants.Type,
        },
      ]);
    });

    // call
    let res = await UsersAuthService.putID(testUser.id, putReq, _ctx);
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
        id: testUser.id,
        name: testUser.id,
        type: testUser.type,
      },
    });
  }).timeout(10000);

  /**
   * putID fail validation
   */
  it('should putID fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const putReq = {
      id: testUser.id + '1',
      password: testUser._test_data.origPassword,
      other: 1,
    };

    // call
    let res = await UsersAuthService.putID(testUser.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "other" is not allowed');
  }).timeout(10000);

  /**
   * putID fail same id (email)
   */
  it('should putID fail same id (email)', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const putReq = {
      id: testUser.id,
      password: testUser._test_data.origPassword,
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
    let res = await UsersAuthService.putID(testUser.id, putReq, { ..._ctx, username: testUser.id });
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
   * putID fail get
   */
  it('should putID fail get', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const putReq = {
      id: testUser.id + '1',
      password: testUser._test_data.origPassword,
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.putID(testUser.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error') },
    });
  }).timeout(10000);

  /**
   * putID fail wrong old password
   */
  it('should putID fail wrong old password', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const putReq = {
      id: testUser.id + '1',
      password: testUser._test_data.origPassword + '1',
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
    let res = await UsersAuthService.putID(testUser.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    return {
      status: 500,
      error: { message: 'Invalid old password', error: new Error('Invalid old password') },
    };
  }).timeout(10000);

  /**
   * putID fail put
   */
  it('should putID fail put', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const putReq = {
      id: testUser.id + '1',
      password: testUser._test_data.origPassword,
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchInfo) => {
      console.log(`\nDbOpsUtils.patch called ${JSON.stringify({ objID, patchInfo }, null, 2)}`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.putID(testUser.id, putReq, _ctx);
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
   * putID fail users details putEmail
   */
  it('should putID fail users details putEmail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const putReq = {
      id: testUser.id + '1',
      password: testUser._test_data.origPassword,
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchInfo) => {
      console.log(`\nDbOpsUtils.patch called ${JSON.stringify({ objID, patchInfo }, null, 2)}`);
      return { status: 200, value: { ...testUser } };
    });

    let stubUserDetails = sinon.stub(UsersRest, 'putEmail').callsFake((objID, objInfo) => {
      console.log(`\nUsersRest.putEmail called ${JSON.stringify({ objID, objInfo }, null, 2)}\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.putID(testUser.id, putReq, {
      ..._ctx,
      userID: testUser.userID,
      username: testUser.id,
    });
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
