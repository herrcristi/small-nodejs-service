const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');
const JwtUtils = require('../../../core/utils/jwt.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');
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
   * putResetPassword with success
   */
  it('should putResetPassword with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // get token from resetPassword
    let rT = await UsersLocalAuthService.getToken({}, testUser, _ctx);
    const authIssuer = `${UsersAuthConstants.ServiceName}`;
    let token = JwtUtils.encrypt(rT.value, authIssuer, _ctx).value; // double encryption

    const putReq = {
      password: testUser._test_data.origPassword,
    };

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, objInfo) => {
      console.log(`\nDbOpsUtils.put called ${JSON.stringify({ objID, objInfo }, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
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
    let res = await UsersAuthService.putResetPassword(token, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
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
   * putResetPassword fail validation
   */
  it('should putResetPassword fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const putReq = {
      password: testUser._test_data.origPassword,
      extra: 1,
    };

    // call
    let res = await UsersAuthService.putResetPassword('token', putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "extra" is not allowed');
  }).timeout(10000);

  /**
   * putResetPassword with success
   */
  it('should putResetPassword with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    let token = 'token-invalid';

    const putReq = {
      password: testUser._test_data.origPassword,
    };

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, objInfo) => {
      console.log(`\nDbOpsUtils.put called ${JSON.stringify({ objID, objInfo }, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubUsersAuthRest = sinon.stub(UsersAuthRest, 'raiseNotification').callsFake((notificationType, objs) => {
      console.log(`\nUsersAuthRest raiseNotification called`);
    });

    // call
    let res = await UsersAuthService.putResetPassword(token, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(0);
    chai.expect(stubEvent.callCount).to.equal(0);
    chai.expect(stubUsersAuthRest.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Cannot decrypt data',
        error: new Error('Cannot decrypt data'),
      },
    });
  }).timeout(10000);

  /**
   * putResetPassword fail put
   */
  it('should putResetPassword fail put', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // get token from resetPassword
    let rT = await UsersLocalAuthService.getToken({}, testUser, _ctx);
    const authIssuer = `${UsersAuthConstants.ServiceName}`;
    let token = JwtUtils.encrypt(rT.value, authIssuer, _ctx).value; // double encryption

    const putReq = {
      password: testUser._test_data.origPassword,
    };

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, objInfo) => {
      console.log(`\nDbOpsUtils.put called ${JSON.stringify({ objID, objInfo }, null, 2)}`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubUsersAuthRest = sinon.stub(UsersAuthRest, 'raiseNotification').callsFake((notificationType, objs) => {
      console.log(`\nUsersAuthRest raiseNotification called`);
    });

    // call
    let res = await UsersAuthService.putResetPassword(token, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(0);
    chai.expect(stubUsersAuthRest.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error') },
    });
  }).timeout(10000);
});
