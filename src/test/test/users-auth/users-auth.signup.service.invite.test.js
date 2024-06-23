const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthSignupService = require('../../../services/users-auth/users-auth.signup.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');

const EventsRest = require('../../../services/rest/events.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users', tenantID: 'tenantID1' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * invite with success new user
   */
  it('should invite with success new user', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersInvite);
    const testUser = testUsers[0];

    const inviteReq = {
      ...testUser,
    };

    const testUserID = 'user1';

    // stub users
    let stubUsersGetByEmail = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOneByEmail called with ${JSON.stringify(email, null, 2)}`);
      chai.expect(email).to.equal(testUser.email);

      return {
        status: 404,
        error: {
          message: `Not found ${testUser.email} in test`,
          error: new Error(`Not found ${testUser.email} in test`),
        },
      };
    });

    let stubUsersPost = sinon.stub(UsersRest, 'post').callsFake((userReq) => {
      console.log(`\nUsersRest.post called with ${JSON.stringify(userReq, null, 2)}`);
      chai.expect(userReq).to.deep.equal({
        email: testUser.email,
        schools: [
          {
            id: _ctx.tenantID,
            roles: ['admin'],
          },
        ],
      });

      return {
        status: 201,
        value: { id: testUserID, email: testUser.email, name: testUser.email, type: UsersRest.Constants.Type },
      };
    });

    let stubUsersDelete = sinon.stub(UsersRest, 'delete').callsFake((userID) => {
      console.log(`\nUsersRest.delete called with ${JSON.stringify(userID, null, 2)}`);
      chai.expect(userID).to.equal(testUserID);

      return {
        status: 200,
        value: { id: testUserID, email: testUser.email, type: UsersRest.Constants.Type },
      };
    });

    // stub users auth
    let stubUsersAuthPost = sinon.stub(UsersAuthService, 'post').callsFake((userAuthReq) => {
      console.log(`\nUsersAuthRest.post called with ${JSON.stringify(userAuthReq, null, 2)}`);

      chai.expect(userAuthReq.password.length).to.equal(64);
      chai.expect({ ...userAuthReq, password: null }).to.deep.equal({
        id: testUser.email,
        password: null,
        userID: testUserID,
      });

      return {
        status: 201,
        value: { id: testUser.email, type: UsersAuthRest.Constants.Type, userID: testUserID },
      };
    });
    let stubUsersAuthResetPass = sinon.stub(UsersAuthService, 'resetPassword').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.resetPassword called with ${JSON.stringify(objInfo, null, 2)}`);

      chai.expect(objInfo).to.deep.equal({
        id: testUser.email,
      });

      return {
        status: 200,
        value: { id: testUser.email, type: UsersAuthRest.Constants.Type, name: testUser.id },
      };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.invite(testUserID, inviteReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGetByEmail.callCount).to.equal(1);
    chai.expect(stubUsersPost.callCount).to.equal(1);
    chai.expect(stubUsersDelete.callCount).to.equal(0);

    chai.expect(stubUsersAuthPost.callCount).to.equal(1);
    chai.expect(stubUsersAuthResetPass.callCount).to.equal(1);

    chai.expect(stubEvents.callCount).to.equal(0);

    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        id: testUser.email,
        type: UsersAuthRest.Constants.Type,
        userID: testUserID,
      },
    });
  }).timeout(10000);

  /**
   * invite fail validation
   */
  it('should invite fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersInvite);
    const testUser = testUsers[0];

    const inviteReq = {
      ...testUser,
      something: 1,
    };

    // call
    let res = await UsersAuthSignupService.invite('id1', inviteReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "something" is not allowed');
  }).timeout(10000);

  /**
   * invite with fail check user exists
   */
  it('should invite with fail check user exists', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersInvite);
    const testUser = testUsers[0];

    const inviteReq = {
      ...testUser,
    };

    const testUserID = 'user1';

    // stub users
    let stubUsersGetByEmail = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOneByEmail called with ${JSON.stringify(email, null, 2)}`);
      chai.expect(email).to.equal(testUser.email);

      return { status: 500, error: { message: `Test error`, error: new Error(`Test error`) } };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.invite(testUserID, inviteReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGetByEmail.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error', error: new Error('Test error') },
    });
  }).timeout(10000);

  /**
   * invite with success existing user add role
   */
  it('should invite with success existing user add role', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersInvite);
    const testUser = testUsers[0];

    const inviteReq = {
      ...testUser,
    };

    const testUserID = 'user1';

    // stub users
    let stubUsersGetByEmail = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOneByEmail called with ${JSON.stringify(email, null, 2)}`);
      chai.expect(email).to.equal(testUser.email);

      return {
        status: 200,
        value: {
          id: testUserID,
          email: testUser.email,
          name: testUser.email,
          type: UsersRest.Constants.Type,
          schools: [{ id: 'someotherschool' }],
        },
      };
    });

    let stubUsersPost = sinon.stub(UsersRest, 'post').callsFake((userReq) => {
      console.log(`\nUsersRest.post called with ${JSON.stringify(userReq, null, 2)}`);
    });

    let stubUsersDelete = sinon.stub(UsersRest, 'delete').callsFake((userID) => {
      console.log(`\nUsersRest.delete called with ${JSON.stringify(userID, null, 2)}`);
    });

    let stubUsersPatchSchool = sinon.stub(UsersRest, 'patchSchool').callsFake((userID, patchInfo) => {
      console.log(`\nUsersRest.patchSchool called with ${JSON.stringify({ userID, patchInfo }, null, 2)}`);

      chai.expect(userID).to.equal(testUserID);
      chai.expect(patchInfo).to.deep.equal({
        add: {
          schools: [
            {
              id: _ctx.tenantID,
              roles: ['admin'],
            },
          ],
        },
      });

      return {
        status: 200,
        value: { id: testUser.email, type: UsersAuthRest.Constants.Type, name: testUser.id },
      };
    });

    // stub users auth
    let stubUsersAuthPost = sinon.stub(UsersAuthService, 'post').callsFake((userAuthReq) => {
      console.log(`\nUsersAuthRest.post called with ${JSON.stringify(userAuthReq, null, 2)}`);
    });
    let stubUsersAuthResetPass = sinon.stub(UsersAuthService, 'resetPassword').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.resetPassword called with ${JSON.stringify(objInfo, null, 2)}`);

      chai.expect(objInfo).to.deep.equal({
        id: testUser.email,
      });

      return {
        status: 200,
        value: { id: testUser.email, type: UsersAuthRest.Constants.Type, name: testUser.id },
      };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.invite(testUserID, inviteReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGetByEmail.callCount).to.equal(1);
    chai.expect(stubUsersPost.callCount).to.equal(0);
    chai.expect(stubUsersDelete.callCount).to.equal(0);
    chai.expect(stubUsersPatchSchool.callCount).to.equal(1);

    chai.expect(stubUsersAuthPost.callCount).to.equal(0);
    chai.expect(stubUsersAuthResetPass.callCount).to.equal(1);

    chai.expect(stubEvents.callCount).to.equal(0);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testUser.email,
        name: testUser.email,
        type: UsersAuthRest.Constants.Type,
        userID: testUserID,
      },
    });
  }).timeout(10000);

  /**
   * invite with fail to add role for existing user
   */
  it('should invite with fail to add role for existing user', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersInvite);
    const testUser = testUsers[0];

    const inviteReq = {
      ...testUser,
    };

    const testUserID = 'user1';

    // stub users
    let stubUsersGetByEmail = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOneByEmail called with ${JSON.stringify(email, null, 2)}`);
      chai.expect(email).to.equal(testUser.email);

      return {
        status: 200,
        value: {
          id: testUserID,
          email: testUser.email,
          name: testUser.email,
          type: UsersRest.Constants.Type,
          schools: [{ id: 'someotherschool' }],
        },
      };
    });

    let stubUsersPost = sinon.stub(UsersRest, 'post').callsFake((userReq) => {
      console.log(`\nUsersRest.post called with ${JSON.stringify(userReq, null, 2)}`);
    });

    let stubUsersDelete = sinon.stub(UsersRest, 'delete').callsFake((userID) => {
      console.log(`\nUsersRest.delete called with ${JSON.stringify(userID, null, 2)}`);
    });

    let stubUsersPatchSchool = sinon.stub(UsersRest, 'patchSchool').callsFake((userID, patchInfo) => {
      console.log(`\nUsersRest.patchSchool called with ${JSON.stringify({ userID, patchInfo }, null, 2)}`);

      chai.expect(userID).to.equal(testUserID);
      chai.expect(patchInfo).to.deep.equal({
        add: {
          schools: [
            {
              id: _ctx.tenantID,
              roles: ['admin'],
            },
          ],
        },
      });

      return { status: 500, error: { message: `Test error`, error: new Error(`Test error`) } };
    });

    // stub users auth
    let stubUsersAuthPost = sinon.stub(UsersAuthService, 'post').callsFake((userAuthReq) => {
      console.log(`\nUsersAuthRest.post called with ${JSON.stringify(userAuthReq, null, 2)}`);
    });
    let stubUsersAuthResetPass = sinon.stub(UsersAuthService, 'resetPassword').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.resetPassword called with ${JSON.stringify(objInfo, null, 2)}`);

      chai.expect(objInfo).to.deep.equal({
        id: testUser.email,
      });

      return {
        status: 200,
        value: { id: testUser.email, type: UsersAuthRest.Constants.Type, name: testUser.id },
      };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.invite(testUserID, inviteReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGetByEmail.callCount).to.equal(1);
    chai.expect(stubUsersPost.callCount).to.equal(0);
    chai.expect(stubUsersDelete.callCount).to.equal(0);
    chai.expect(stubUsersPatchSchool.callCount).to.equal(1);

    chai.expect(stubUsersAuthPost.callCount).to.equal(0);
    chai.expect(stubUsersAuthResetPass.callCount).to.equal(0);

    chai.expect(stubEvents.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error',
        error: new Error('Test error'),
      },
    });
  }).timeout(10000);

  /**
   * invite with skip to add role for existing user
   */
  it('should invite with skip to add role for existing user', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersInvite);
    const testUser = testUsers[0];

    const inviteReq = {
      ...testUser,
    };

    const testUserID = 'user1';

    // stub users
    let stubUsersGetByEmail = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOneByEmail called with ${JSON.stringify(email, null, 2)}`);
      chai.expect(email).to.equal(testUser.email);

      return {
        status: 200,
        value: {
          id: testUserID,
          email: testUser.email,
          name: testUser.email,
          type: UsersRest.Constants.Type,
          schools: [
            {
              id: _ctx.tenantID,
              roles: [testUser.school.role],
            },
          ],
        },
      };
    });

    let stubUsersPost = sinon.stub(UsersRest, 'post').callsFake((userReq) => {
      console.log(`\nUsersRest.post called with ${JSON.stringify(userReq, null, 2)}`);
    });

    let stubUsersDelete = sinon.stub(UsersRest, 'delete').callsFake((userID) => {
      console.log(`\nUsersRest.delete called with ${JSON.stringify(userID, null, 2)}`);
    });

    let stubUsersPatchSchool = sinon.stub(UsersRest, 'patchSchool').callsFake((userID, patchInfo) => {
      console.log(`\nUsersRest.patchSchool called with ${JSON.stringify({ userID, patchInfo }, null, 2)}`);
    });

    // stub users auth
    let stubUsersAuthPost = sinon.stub(UsersAuthService, 'post').callsFake((userAuthReq) => {
      console.log(`\nUsersAuthRest.post called with ${JSON.stringify(userAuthReq, null, 2)}`);
    });
    let stubUsersAuthResetPass = sinon.stub(UsersAuthService, 'resetPassword').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.resetPassword called with ${JSON.stringify(objInfo, null, 2)}`);

      chai.expect(objInfo).to.deep.equal({
        id: testUser.email,
      });

      return {
        status: 200,
        value: { id: testUser.email, type: UsersAuthRest.Constants.Type, name: testUser.id },
      };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.invite(testUserID, inviteReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGetByEmail.callCount).to.equal(1);
    chai.expect(stubUsersPost.callCount).to.equal(0);
    chai.expect(stubUsersDelete.callCount).to.equal(0);
    chai.expect(stubUsersPatchSchool.callCount).to.equal(0);

    chai.expect(stubUsersAuthPost.callCount).to.equal(0);
    chai.expect(stubUsersAuthResetPass.callCount).to.equal(1);

    chai.expect(stubEvents.callCount).to.equal(0);

    chai.expect(res).to.deep.equal({
      status: 204,
      value: {
        id: testUser.email,
        name: testUser.email,
        type: UsersAuthRest.Constants.Type,
        userID: testUserID,
      },
    });
  }).timeout(10000);
});
