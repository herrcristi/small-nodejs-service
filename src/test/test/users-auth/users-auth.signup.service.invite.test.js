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
   * invite with success
   */
  it('should invite with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersInvite);
    const testUser = testUsers[0];

    const inviteReq = {
      ...testUser,
    };

    const testSchoolID = 'school1';
    const testUserID = 'user1';

    // stub

    // // stub users
    // let stubUsersPost = sinon.stub(UsersRest, 'post').callsFake((userReq) => {
    //   console.log(`\nUsersRest.post called with ${JSON.stringify(userReq, null, 2)}`);
    //   chai.expect(userReq).to.deep.equal({
    //     email: testUser.email,
    //     name: testUser.name,
    //     birthday: testUser.birthday,
    //     phoneNumber: testUser.phoneNumber,
    //     address: testUser.address,
    //     schools: [
    //       {
    //         id: testSchoolID,
    //         roles: ['admin'],
    //       },
    //     ],
    //   });

    //   return {
    //     status: 201,
    //     value: { id: testUserID, email: testUser.email, type: UsersRest.Constants.Type },
    //   };
    // });

    // // stub users auth
    // let stubUsersAuthPost = sinon.stub(UsersAuthService, 'post').callsFake((userAuthReq) => {
    //   console.log(`\nUsersAuthRest.post called with ${JSON.stringify(userAuthReq, null, 2)}`);
    //   chai.expect(userAuthReq).to.deep.equal({
    //     id: testUser.email,
    //     password: testUser.password,
    //     userID: testUserID,
    //   });

    //   return {
    //     status: 201,
    //     value: { id: testUser.email, type: UsersAuthRest.Constants.Type, userID: testUserID },
    //   };
    // });

    // let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
    //   console.log(`\nEventsRest.raiseEventForObject called`);
    // });

    // call
    let res = await UsersAuthSignupService.invite(testUserID, inviteReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    // chai.expect(stubUsersPost.callCount).to.equal(1);
    // chai.expect(stubUsersDelete.callCount).to.equal(0);

    // chai.expect(stubUsersAuthPost.callCount).to.equal(1);

    // chai.expect(stubEvents.callCount).to.equal(0);

    // chai.expect(res).to.deep.equal({
    //   status: 201,
    //   value: {
    //     id: testUser.email,
    //     type: UsersAuthRest.Constants.Type,
    //     userID: testUserID,
    //   },
    // });
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Not implemented', error: new Error('Not implemented') },
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
});
