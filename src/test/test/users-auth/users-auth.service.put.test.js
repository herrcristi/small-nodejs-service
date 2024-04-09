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

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * put with success
   */
  it('should put with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const putReq = {
      ...testUser,
    };
    delete putReq.id;
    delete putReq.userID;
    delete putReq.type;

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, putObj) => {
      console.log(`DbOpsUtils.put called`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    let stubUsersAuthRest = sinon.stub(UsersAuthRest, 'raiseNotification').callsFake((notificationType, objs) => {
      console.log(`UsersAuthRest raiseNotification called`);
      console.log(`NotificationType: ${JSON.stringify(notificationType, null, 2)}`);
      console.log(`Notifications: ${JSON.stringify(objs, null, 2)}`);

      chai.expect(notificationType).to.equal(NotificationsUtils.Constants.Notification.Modified);
      chai.expect(objs).to.deep.equal([
        {
          id: testUser.id,
          type: UsersAuthConstants.Type,
          userID: testUser.userID,
        },
      ]);
    });

    // call
    let res = await UsersAuthService.put(testUser.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubUsersAuthRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testUser.id,
        type: testUser.type,
        userID: testUser.userID,
      },
    });
  }).timeout(10000);

  /**
   * put fail validation
   */
  it('should put fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const putReq = {
      ...testUser,
    };

    // call
    let res = await UsersAuthService.put(testUser.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "id" is not allowed');
  }).timeout(10000);

  /**
   * put fail put
   */
  it('should put fail put', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const putReq = {
      ...testUser,
    };
    delete putReq.id;
    delete putReq.type;
    delete putReq.userID;

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, putObj) => {
      console.log(`DbOpsUtils.put called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await UsersAuthService.put(testUser.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);
});
