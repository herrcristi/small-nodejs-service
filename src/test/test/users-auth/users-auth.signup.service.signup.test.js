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
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * signup with success new user
   */
  it('should signup with success new user', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersSignup);
    const testUser = testUsers[0];

    const signupReq = {
      ...testUser,
    };

    const testSchoolID = 'school1';
    const testUserID = 'user1';

    // stub schools
    let stubSchoolsPost = sinon.stub(SchoolsRest, 'post').callsFake((schoolReq) => {
      console.log(`\nSchoolsRest.post called with ${JSON.stringify(schoolReq, null, 2)}`);
      chai.expect(schoolReq).to.deep.equal({
        name: 'GitHub University',
        description: 'GitHub University. The place to code.',
      });

      return {
        status: 201,
        value: { id: testSchoolID },
      };
    });
    let stubSchoolsDelete = sinon.stub(SchoolsRest, 'delete').callsFake((schoolID) => {
      console.log(`\nSchoolsRest.delete called with ${JSON.stringify(schoolID, null, 2)}`);
      chai.expect(schoolID).to.equal(testSchoolID);

      return {
        status: 200,
        value: { id: testSchoolID },
      };
    });

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
            id: testSchoolID,
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
    let res = await UsersAuthSignupService.signup(signupReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubSchoolsPost.callCount).to.equal(1);
    chai.expect(stubSchoolsDelete.callCount).to.equal(0);

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
   * signup fail validation
   */
  it('should signup fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersSignup);
    const testUser = testUsers[0];

    const signupReq = {
      ...testUser,
      something: 1,
    };

    // call
    let res = await UsersAuthSignupService.signup(signupReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "something" is not allowed');
  }).timeout(10000);

  /**
   * signup fail schools
   */
  it('should signup fail schools', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersSignup);
    const testUser = testUsers[0];

    const signupReq = {
      ...testUser,
    };

    const testSchoolID = 'school1';
    const testUserID = 'user1';

    // stub schools
    let stubSchoolsPost = sinon.stub(SchoolsRest, 'post').callsFake((schoolReq) => {
      console.log(`\nSchoolsRest.post called with ${JSON.stringify(schoolReq, null, 2)}`);
      chai.expect(schoolReq).to.deep.equal({
        name: 'GitHub University',
        description: 'GitHub University. The place to code.',
      });

      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    let stubSchoolsDelete = sinon.stub(SchoolsRest, 'delete').callsFake((schoolID) => {
      console.log(`\nSchoolsRest.delete called with ${JSON.stringify(schoolID, null, 2)}`);
      chai.expect(schoolID).to.equal(testSchoolID);

      return {
        status: 200,
        value: { id: testSchoolID },
      };
    });

    // stub users auth
    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.signup(signupReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubSchoolsPost.callCount).to.equal(1);
    chai.expect(stubSchoolsDelete.callCount).to.equal(0);

    chai.expect(stubEvents.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * signup fail users
   */
  it('should signup fail users', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersSignup);
    const testUser = testUsers[0];

    const signupReq = {
      ...testUser,
    };

    const testSchoolID = 'school1';
    const testUserID = 'user1';

    // stub schools
    let stubSchoolsPost = sinon.stub(SchoolsRest, 'post').callsFake((schoolReq) => {
      console.log(`\nSchoolsRest.post called with ${JSON.stringify(schoolReq, null, 2)}`);
      chai.expect(schoolReq).to.deep.equal({
        name: 'GitHub University',
        description: 'GitHub University. The place to code.',
      });

      return {
        status: 201,
        value: { id: testSchoolID },
      };
    });

    let stubSchoolsDelete = sinon.stub(SchoolsRest, 'delete').callsFake((schoolID) => {
      console.log(`\nSchoolsRest.delete called with ${JSON.stringify(schoolID, null, 2)}`);
      chai.expect(schoolID).to.equal(testSchoolID);

      return {
        status: 200,
        value: { id: testSchoolID },
      };
    });

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
            id: testSchoolID,
            roles: ['admin'],
          },
        ],
      });

      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    let stubUsersDelete = sinon.stub(UsersRest, 'delete').callsFake((userID) => {
      console.log(`\nUsersRest.delete called with ${JSON.stringify(userID, null, 2)}`);
      chai.expect(userID).to.equal(testUserID);

      return {
        status: 200,
        value: { id: testUserID, email: testUser.email, type: UsersRest.Constants.Type },
      };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.signup(signupReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubSchoolsPost.callCount).to.equal(1);
    chai.expect(stubSchoolsDelete.callCount).to.equal(1);

    chai.expect(stubUsersGetByEmail.callCount).to.equal(1);
    chai.expect(stubUsersPost.callCount).to.equal(1);
    chai.expect(stubUsersDelete.callCount).to.equal(0);

    chai.expect(stubEvents.callCount).to.equal(2);

    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * signup fail users auth
   */
  it('should signup fail users auth', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersSignup);
    const testUser = testUsers[0];

    const signupReq = {
      ...testUser,
    };

    const testSchoolID = 'school1';
    const testUserID = 'user1';

    // stub schools
    let stubSchoolsPost = sinon.stub(SchoolsRest, 'post').callsFake((schoolReq) => {
      console.log(`\nSchoolsRest.post called with ${JSON.stringify(schoolReq, null, 2)}`);
      chai.expect(schoolReq).to.deep.equal({
        name: 'GitHub University',
        description: 'GitHub University. The place to code.',
      });

      return {
        status: 201,
        value: { id: testSchoolID },
      };
    });

    let stubSchoolsDelete = sinon.stub(SchoolsRest, 'delete').callsFake((schoolID) => {
      console.log(`\nSchoolsRest.delete called with ${JSON.stringify(schoolID, null, 2)}`);
      chai.expect(schoolID).to.equal(testSchoolID);

      return {
        status: 200,
        value: { id: testSchoolID },
      };
    });

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
            id: testSchoolID,
            roles: ['admin'],
          },
        ],
      });

      return {
        status: 201,
        value: { id: testUserID, email: testUser.email, type: UsersRest.Constants.Type },
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
      chai.expect({ ...userAuthReq, password: null }).to.deep.equal({
        id: testUser.email,
        password: null,
        userID: testUserID,
      });

      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.signup(signupReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubSchoolsPost.callCount).to.equal(1);
    chai.expect(stubSchoolsDelete.callCount).to.equal(1);

    chai.expect(stubUsersGetByEmail.callCount).to.equal(1);
    chai.expect(stubUsersPost.callCount).to.equal(1);
    chai.expect(stubUsersDelete.callCount).to.equal(1);

    chai.expect(stubUsersAuthPost.callCount).to.equal(1);

    chai.expect(stubEvents.callCount).to.equal(2);

    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);
});
