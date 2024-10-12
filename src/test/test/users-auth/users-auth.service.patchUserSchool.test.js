const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users', tenantID: TestConstants.Schools[0].id };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * patchUserSchool with success
   */
  it('should patchUserSchool with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const patchReq = {
      add: {
        roles: ['admin'],
      },
    };

    // stub
    let stubUserDetails = sinon.stub(UsersRest, 'patchSchool').callsFake((objID, patchInfo) => {
      console.log(`\nUsersRest.patchSchool called ${JSON.stringify({ objID, patchInfo }, null, 2)}\n`);
      return { status: 200, value: { id: testUser.userID } };
    });

    // call
    let res = await UsersAuthService.patchUserSchool(testUser.id, testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUserDetails.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testUser.userID,
      },
    });
  }).timeout(10000);

  /**
   * patchUserSchool with success but no admin remove
   */
  it('should patchUserSchool with success but no admin remove', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const patchReq = {
      remove: {
        roles: ['admin'],
      },
    };

    // stub
    let stubUserDetails = sinon.stub(UsersRest, 'patchSchool').callsFake((objID, patchInfo) => {
      console.log(`\nUsersRest.patchSchool called ${JSON.stringify({ objID, patchInfo }, null, 2)}\n`);
      chai.expect(patchInfo).to.deep.equal({});

      return { status: 200, value: { id: testUser.userID } };
    });

    // call
    let res = await UsersAuthService.patchUserSchool(testUser.id, testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUserDetails.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testUser.userID,
      },
    });
  }).timeout(10000);

  /**
   * patchUserSchool fail validation
   */
  it('should patchUserSchool fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const patchReq = {
      set: {
        roles: ['admin'],
      },
    };

    // call
    let res = await UsersAuthService.patchUserSchool(testUser.id, testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "set" is not allowed');
  }).timeout(10000);

  /**
   * patchUserSchool fail patchSchool
   */
  it('should patchUserSchool fail patchSchool', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const patchReq = {
      remove: {
        roles: ['admin'],
      },
    };

    // stub
    let stubUserDetails = sinon.stub(UsersRest, 'patchSchool').callsFake((objID, patchInfo) => {
      console.log(`\nUsersRest.patchSchool called ${JSON.stringify({ objID, patchInfo }, null, 2)}\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.patchUserSchool(testUser.id, testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUserDetails.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error') },
    });
  }).timeout(10000);
});
