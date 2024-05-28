const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils.js');
const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');

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
   * delete with success
   */
  it('should delete with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const testUsersDetails = _.cloneDeep(TestConstants.Users);
    const testUserDetails = testUsersDetails[0];

    let stubBase = sinon.stub(DbOpsUtils, 'delete').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.delete called`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubUserDetails = sinon.stub(UsersRest, 'delete').callsFake((objID) => {
      console.log(`\nUsersRest.delete called ${JSON.stringify(objID, null, 2)}\n`);
      return {
        status: 200,
        value: { ...testUserDetails },
      };
    });

    let stubUsersAuthRest = sinon.stub(UsersAuthRest, 'raiseNotification').callsFake(() => {
      console.log(`\nUsersAuthRest raiseNotification called`);
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject');

    // call
    let res = await UsersAuthService.delete(testUser.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUserDetails.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(1);
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
   * delete fail
   */
  it('should delete fail ', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'delete').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.delete called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.delete(testUser.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error') },
    });
  }).timeout(10000);

  /**
   * delete fail user details
   */
  it('should fail user details', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const testUsersDetails = _.cloneDeep(TestConstants.Users);
    const testUserDetails = testUsersDetails[0];

    let stubBase = sinon.stub(DbOpsUtils, 'delete').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.delete called`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubUserDetails = sinon.stub(UsersRest, 'delete').callsFake((objID) => {
      console.log(`\nUsersRest.delete called ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    let stubUsersAuthRest = sinon.stub(UsersAuthRest, 'raiseNotification').callsFake(() => {
      console.log(`\nUsersAuthRest raiseNotification called`);
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject');

    // call
    let res = await UsersAuthService.delete(testUser.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubUserDetails.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(0);
    chai.expect(stubUsersAuthRest.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error') },
    });
  }).timeout(10000);
});
