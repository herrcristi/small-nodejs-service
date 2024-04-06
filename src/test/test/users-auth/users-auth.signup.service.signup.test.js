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
   * signup with success
   */
  it('should signup with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersSignup);
    const testUser = testUsers[0];

    const signupReq = {
      ...testUser,
    };

    const testSchoolID = 'school1';
    const testUserID = 'user1';

    // stub schools
    let stubSchoolsPost = sinon.stub(SchoolsRest, 'post').callsFake((schoolReq) => {
      console.log(`SchoolsRest.post called with ${JSON.stringify(schoolReq, null, 2)}`);
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
      console.log(`SchoolsRest.delete called with ${JSON.stringify(schoolID, null, 2)}`);
      chai.expect(schoolID).to.equal(testSchoolID);

      return {
        status: 200,
        value: { id: testSchoolID },
      };
    });

    // stub users
    let stubUsersPost = sinon.stub(UsersRest, 'post').callsFake((userReq) => {
      console.log(`UsersRest.post called with ${JSON.stringify(userReq, null, 2)}`);
      chai.expect(userReq).to.deep.equal({
        email: testUser.email,
        name: testUser.name,
        birthday: testUser.birthday,
        phoneNumber: testUser.phoneNumber,
        address: testUser.address,
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
      console.log(`UsersRest.delete called with ${JSON.stringify(userID, null, 2)}`);
      chai.expect(userID).to.equal(testUserID);

      return {
        status: 200,
        value: { id: testUserID, email: testUser.email, type: UsersRest.Constants.Type },
      };
    });

    // stub users atuh
    let stubUsersAuthPost = sinon.stub(UsersAuthService, 'post').callsFake((userAuthReq) => {
      console.log(`UsersAuthRest.post called with ${JSON.stringify(userAuthReq, null, 2)}`);
      chai.expect(userAuthReq).to.deep.equal({
        id: testUserID,
        email: testUser.email,
        password: testUser.password,
      });

      return {
        status: 201,
        value: { id: testUserID, email: testUser.email, type: UsersAuthRest.Constants.Type },
      };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.signup(signupReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubSchoolsPost.callCount).to.equal(1);
    chai.expect(stubSchoolsDelete.callCount).to.equal(0);

    chai.expect(stubUsersPost.callCount).to.equal(1);
    chai.expect(stubUsersDelete.callCount).to.equal(0);

    chai.expect(stubUsersAuthPost.callCount).to.equal(1);

    chai.expect(stubEvents.callCount).to.equal(0);

    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        id: testUserID,
        email: testUser.email,
        type: UsersAuthRest.Constants.Type,
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
      console.log(`SchoolsRest.post called with ${JSON.stringify(schoolReq, null, 2)}`);
      chai.expect(schoolReq).to.deep.equal({
        name: 'GitHub University',
        description: 'GitHub University. The place to code.',
      });

      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    let stubSchoolsDelete = sinon.stub(SchoolsRest, 'delete').callsFake((schoolID) => {
      console.log(`SchoolsRest.delete called with ${JSON.stringify(schoolID, null, 2)}`);
      chai.expect(schoolID).to.equal(testSchoolID);

      return {
        status: 200,
        value: { id: testSchoolID },
      };
    });

    // stub users
    let stubUsersPost = sinon.stub(UsersRest, 'post').callsFake((userReq) => {
      console.log(`UsersRest.post called with ${JSON.stringify(userReq, null, 2)}`);
      chai.expect(userReq).to.deep.equal({
        email: testUser.email,
        name: testUser.name,
        birthday: testUser.birthday,
        phoneNumber: testUser.phoneNumber,
        address: testUser.address,
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
      console.log(`UsersRest.delete called with ${JSON.stringify(userID, null, 2)}`);
      chai.expect(userID).to.equal(testUserID);

      return {
        status: 200,
        value: { id: testUserID, email: testUser.email, type: UsersRest.Constants.Type },
      };
    });

    // stub users atuh
    let stubUsersAuthPost = sinon.stub(UsersAuthService, 'post').callsFake((userAuthReq) => {
      console.log(`UsersAuthRest.post called with ${JSON.stringify(userAuthReq, null, 2)}`);
      chai.expect(userAuthReq).to.deep.equal({
        id: testUserID,
        email: testUser.email,
        password: testUser.password,
      });

      return {
        status: 201,
        value: { id: testUserID, email: testUser.email, type: UsersAuthRest.Constants.Type },
      };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.signup(signupReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubSchoolsPost.callCount).to.equal(1);
    chai.expect(stubSchoolsDelete.callCount).to.equal(0);

    chai.expect(stubUsersPost.callCount).to.equal(0);
    chai.expect(stubUsersDelete.callCount).to.equal(0);

    chai.expect(stubUsersAuthPost.callCount).to.equal(0);

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
      console.log(`SchoolsRest.post called with ${JSON.stringify(schoolReq, null, 2)}`);
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
      console.log(`SchoolsRest.delete called with ${JSON.stringify(schoolID, null, 2)}`);
      chai.expect(schoolID).to.equal(testSchoolID);

      return {
        status: 200,
        value: { id: testSchoolID },
      };
    });

    // stub users
    let stubUsersPost = sinon.stub(UsersRest, 'post').callsFake((userReq) => {
      console.log(`UsersRest.post called with ${JSON.stringify(userReq, null, 2)}`);
      chai.expect(userReq).to.deep.equal({
        email: testUser.email,
        name: testUser.name,
        birthday: testUser.birthday,
        phoneNumber: testUser.phoneNumber,
        address: testUser.address,
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
      console.log(`UsersRest.delete called with ${JSON.stringify(userID, null, 2)}`);
      chai.expect(userID).to.equal(testUserID);

      return {
        status: 200,
        value: { id: testUserID, email: testUser.email, type: UsersRest.Constants.Type },
      };
    });

    // stub users atuh
    let stubUsersAuthPost = sinon.stub(UsersAuthService, 'post').callsFake((userAuthReq) => {
      console.log(`UsersAuthRest.post called with ${JSON.stringify(userAuthReq, null, 2)}`);
      chai.expect(userAuthReq).to.deep.equal({
        id: testUserID,
        email: testUser.email,
        password: testUser.password,
      });

      return {
        status: 201,
        value: { id: testUserID, email: testUser.email, type: UsersAuthRest.Constants.Type },
      };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.signup(signupReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubSchoolsPost.callCount).to.equal(1);
    chai.expect(stubSchoolsDelete.callCount).to.equal(1);

    chai.expect(stubUsersPost.callCount).to.equal(1);
    chai.expect(stubUsersDelete.callCount).to.equal(0);

    chai.expect(stubUsersAuthPost.callCount).to.equal(0);

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
      console.log(`SchoolsRest.post called with ${JSON.stringify(schoolReq, null, 2)}`);
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
      console.log(`SchoolsRest.delete called with ${JSON.stringify(schoolID, null, 2)}`);
      chai.expect(schoolID).to.equal(testSchoolID);

      return {
        status: 200,
        value: { id: testSchoolID },
      };
    });

    // stub users
    let stubUsersPost = sinon.stub(UsersRest, 'post').callsFake((userReq) => {
      console.log(`UsersRest.post called with ${JSON.stringify(userReq, null, 2)}`);
      chai.expect(userReq).to.deep.equal({
        email: testUser.email,
        name: testUser.name,
        birthday: testUser.birthday,
        phoneNumber: testUser.phoneNumber,
        address: testUser.address,
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
      console.log(`UsersRest.delete called with ${JSON.stringify(userID, null, 2)}`);
      chai.expect(userID).to.equal(testUserID);

      return {
        status: 200,
        value: { id: testUserID, email: testUser.email, type: UsersRest.Constants.Type },
      };
    });

    // stub users atuh
    let stubUsersAuthPost = sinon.stub(UsersAuthService, 'post').callsFake((userAuthReq) => {
      console.log(`UsersAuthRest.post called with ${JSON.stringify(userAuthReq, null, 2)}`);
      chai.expect(userAuthReq).to.deep.equal({
        id: testUserID,
        email: testUser.email,
        password: testUser.password,
      });

      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.signup(signupReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubSchoolsPost.callCount).to.equal(1);
    chai.expect(stubSchoolsDelete.callCount).to.equal(1);

    chai.expect(stubUsersPost.callCount).to.equal(1);
    chai.expect(stubUsersDelete.callCount).to.equal(1);

    chai.expect(stubUsersAuthPost.callCount).to.equal(1);

    chai.expect(stubEvents.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);
});
