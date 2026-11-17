const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

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
        username: testUser.email,
        password: null,
        userID: testUserID,
      });

      return {
        status: 201,
        value: { username: testUser.email, type: UsersAuthRest.Constants.Type, userID: testUserID },
      };
    });
    let stubUsersAuthResetPass = sinon.stub(UsersAuthService, 'resetPassword').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.resetPassword called with ${JSON.stringify(objInfo, null, 2)}`);

      chai.expect(objInfo).to.deep.equal({
        username: testUser.email,
      });

      return {
        status: 200,
        value: { username: testUser.email, type: UsersAuthRest.Constants.Type, userID: testUser.id },
      };
    });

    let stubUsersAuthInvite = sinon.stub(UsersAuthService, 'sendInvite').callsFake((objInfo) => {
      console.log(`\nUsersAuth.invite called with ${JSON.stringify(objInfo, null, 2)}`);

      chai.expect(objInfo).to.deep.equal({
        username: testUser.email,
      });

      return {
        status: 200,
        value: { username: testUser.email, type: UsersAuthRest.Constants.Type, userID: testUser.id },
      };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.invite(inviteReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGetByEmail.callCount).to.equal(1);
    chai.expect(stubUsersPost.callCount).to.equal(1);
    chai.expect(stubUsersDelete.callCount).to.equal(0);

    chai.expect(stubUsersAuthPost.callCount).to.equal(1);
    chai.expect(stubUsersAuthResetPass.callCount).to.equal(1);
    chai.expect(stubUsersAuthInvite.callCount).to.equal(0);

    chai.expect(stubEvents.callCount).to.equal(0);

    // the same answer for new users, existing users and members (it does not tell if an account exists)
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        username: testUser.email,
        type: UsersAuthRest.Constants.Type,
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
    let res = await UsersAuthSignupService.invite(inviteReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "something" is not allowed');
  }).timeout(10000);

  /**
   * invite portal-admin role is allowed only on the portal school
   */
  it('should invite fail portal-admin role on a normal school', async () => {
    const stubUsersGetByEmail = sinon.stub(UsersRest, 'getOneByEmail');
    const stubUsersPost = sinon.stub(UsersRest, 'post');

    const res = await UsersAuthSignupService.invite(
      { email: 'big.ben1@testdomain.test', school: { role: UsersRest.Constants.Roles.PortalAdmin } },
      _ctx
    );

    chai.expect(res.status).to.equal(403);
    chai.expect(res.error.message).to.equal('The portal-admin role can be given only on the portal school');
    chai.expect(stubUsersGetByEmail.callCount).to.equal(0);
    chai.expect(stubUsersPost.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * invite on the portal school accepts only the portal-admin role
   */
  it('should invite fail school role on the portal school', async () => {
    const stubUsersGetByEmail = sinon.stub(UsersRest, 'getOneByEmail');
    const stubUsersPost = sinon.stub(UsersRest, 'post');

    const res = await UsersAuthSignupService.invite(
      { email: 'big.ben1@testdomain.test', school: { role: UsersRest.Constants.Roles.Admin } },
      { ..._ctx, tenantID: TestConstants.PortalSchoolID }
    );

    chai.expect(res.status).to.equal(403);
    chai.expect(res.error.message).to.equal('Only the portal-admin role can be given on the portal school');
    chai.expect(stubUsersGetByEmail.callCount).to.equal(0);
    chai.expect(stubUsersPost.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * invite on the portal school makes the new user a portal admin
   */
  it('should invite with success new portal admin on the portal school', async () => {
    const testUserID = 'user1';
    const email = 'portal.admin@testdomain.test';
    const portalCtx = { ..._ctx, tenantID: TestConstants.PortalSchoolID };

    sinon
      .stub(UsersRest, 'getOneByEmail')
      .returns({ status: 404, error: { message: 'Not found', error: 'Not found' } });
    const stubUsersPost = sinon.stub(UsersRest, 'post').callsFake((userReq) => {
      chai.expect(userReq).to.deep.equal({
        email,
        schools: [{ id: TestConstants.PortalSchoolID, roles: [UsersRest.Constants.Roles.PortalAdmin] }],
      });
      return { status: 201, value: { id: testUserID, email, type: UsersRest.Constants.Type } };
    });
    const stubAuthPost = sinon.stub(UsersAuthService, 'post').returns({
      status: 201,
      value: { username: email, type: UsersAuthRest.Constants.Type, userID: testUserID },
    });
    const stubReset = sinon.stub(UsersAuthService, 'resetPassword').returns({ status: 200, value: true });

    const res = await UsersAuthSignupService.invite(
      { email, school: { role: UsersRest.Constants.Roles.PortalAdmin } },
      portalCtx
    );

    chai.expect(res.status).to.equal(200);
    chai.expect(stubUsersPost.callCount).to.equal(1);
    chai.expect(stubAuthPost.callCount).to.equal(1);
    chai.expect(stubReset.callCount).to.equal(1);
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
    let res = await UsersAuthSignupService.invite(inviteReq, _ctx);
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

    let stubUsersAuthInvite = sinon.stub(UsersAuthService, 'sendInvite').callsFake((objInfo) => {
      console.log(`\nUsersAuth.invite called with ${JSON.stringify(objInfo, null, 2)}`);

      chai.expect(objInfo).to.deep.equal({
        username: testUser.email,
      });

      return {
        status: 200,
        value: { username: testUser.email, type: UsersAuthRest.Constants.Type, userID: testUser.id },
      };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.invite(inviteReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGetByEmail.callCount).to.equal(1);
    chai.expect(stubUsersPost.callCount).to.equal(0);
    chai.expect(stubUsersDelete.callCount).to.equal(0);
    chai.expect(stubUsersPatchSchool.callCount).to.equal(1);

    chai.expect(stubUsersAuthPost.callCount).to.equal(0);
    chai.expect(stubUsersAuthResetPass.callCount).to.equal(0);
    chai.expect(stubUsersAuthInvite.callCount).to.equal(1);

    chai.expect(stubEvents.callCount).to.equal(0);

    // the same answer for new users, existing users and members (it does not tell if an account exists)
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        username: testUser.email,
        type: UsersAuthRest.Constants.Type,
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
    let res = await UsersAuthSignupService.invite(inviteReq, _ctx);
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

    let stubUsersAuthInvite = sinon.stub(UsersAuthService, 'sendInvite').callsFake((objInfo) => {
      console.log(`\nUsersAuth.invite called with ${JSON.stringify(objInfo, null, 2)}`);

      chai.expect(objInfo).to.deep.equal({
        username: testUser.email,
      });

      return {
        status: 200,
        value: { username: testUser.email, type: UsersAuthRest.Constants.Type, name: testUser.id },
      };
    });

    let stubEvents = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    // call
    let res = await UsersAuthSignupService.invite(inviteReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGetByEmail.callCount).to.equal(1);
    chai.expect(stubUsersPost.callCount).to.equal(0);
    chai.expect(stubUsersDelete.callCount).to.equal(0);
    chai.expect(stubUsersPatchSchool.callCount).to.equal(0);

    chai.expect(stubUsersAuthPost.callCount).to.equal(0);
    chai.expect(stubUsersAuthResetPass.callCount).to.equal(0);
    chai.expect(stubUsersAuthInvite.callCount).to.equal(1);

    chai.expect(stubEvents.callCount).to.equal(0);

    // the same answer for new users, existing users and members (it does not tell if an account exists)
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        username: testUser.email,
        type: UsersAuthRest.Constants.Type,
      },
    });
  }).timeout(10000);

  /**
   * a portal admin invites the admin of a school (school.id): the invite is done for that school
   */
  describe('invite the admin of a school by a portal admin', function () {
    const portalCtx = { ..._ctx, tenantID: TestConstants.PortalSchoolID, userID: 'portalAdmin1' };
    const email = 'school.admin@testdomain.test';

    it('should invite an existing user as admin of the school', async () => {
      const stubSchool = sinon
        .stub(SchoolsRest, 'getOne')
        .returns({ status: 200, value: { id: 'school1', name: 'School One' } });
      sinon.stub(UsersRest, 'getOneByEmail').returns({
        status: 200,
        value: { id: 'user1', email, name: 'School Admin', schools: [{ id: 'school2', roles: ['student'] }] },
      });
      const stubPatchSchool = sinon.stub(UsersRest, 'patchSchool').returns({ status: 200, value: { id: 'user1' } });
      const stubSendInvite = sinon.stub(UsersAuthService, 'sendInvite').returns({ status: 200, value: true });

      const res = await UsersAuthSignupService.invite({ email, school: { id: 'school1', role: 'admin' } }, portalCtx);

      chai.expect(res).to.deep.equal({ status: 200, value: { username: email, type: UsersAuthRest.Constants.Type } });
      chai.expect(stubSchool.firstCall.args[0]).to.equal('school1');

      // the role is added on that school, and the invitation names that school
      chai.expect(stubPatchSchool.firstCall.args[1]).to.deep.equal({
        add: { schools: [{ id: 'school1', roles: ['admin'] }] },
      });
      chai.expect(stubPatchSchool.firstCall.args[2]).to.include({ tenantID: 'school1', tenantName: 'School One' });
      chai.expect(stubSendInvite.firstCall.args[1]).to.include({ tenantID: 'school1', tenantName: 'School One' });
    }).timeout(10000);

    it('should invite a new user as admin of the school', async () => {
      sinon.stub(SchoolsRest, 'getOne').returns({ status: 200, value: { id: 'school1', name: 'School One' } });
      sinon.stub(UsersRest, 'getOneByEmail').returns({ status: 404, error: { message: 'Not found' } });
      const stubUsersPost = sinon
        .stub(UsersRest, 'post')
        .returns({ status: 201, value: { id: 'user1', email, type: UsersRest.Constants.Type } });
      sinon.stub(UsersAuthService, 'post').returns({ status: 201, value: { username: email, userID: 'user1' } });
      const stubReset = sinon.stub(UsersAuthService, 'resetPassword').returns({ status: 200, value: true });

      const res = await UsersAuthSignupService.invite({ email, school: { id: 'school1', role: 'admin' } }, portalCtx);

      chai.expect(res.status).to.equal(200);
      chai.expect(stubUsersPost.firstCall.args[0]).to.deep.equal({
        email,
        schools: [{ id: 'school1', roles: ['admin'] }],
      });
      chai.expect(stubReset.firstCall.args[1]).to.include({ tenantID: 'school1', tenantName: 'School One' });
    }).timeout(10000);

    it('should let a school admin invite an admin of its own school, also when it names it', async () => {
      const stubSchool = sinon.stub(SchoolsRest, 'getOne');
      sinon.stub(UsersRest, 'getOneByEmail').returns({
        status: 200,
        value: { id: 'user1', email, name: 'School Admin', schools: [{ id: 'school2', roles: ['student'] }] },
      });
      const stubPatchSchool = sinon.stub(UsersRest, 'patchSchool').returns({ status: 200, value: { id: 'user1' } });
      sinon.stub(UsersAuthService, 'sendInvite').returns({ status: 200, value: true });

      // the selected school of the school admin (_ctx.tenantID), with and without school.id
      for (const school of [{ id: _ctx.tenantID, role: 'admin' }, { role: 'admin' }]) {
        const res = await UsersAuthSignupService.invite({ email, school }, _ctx);
        chai.expect(res.status).to.equal(200);
      }

      chai.expect(stubSchool.callCount).to.equal(0); // the selected school, no lookup
      for (const call of stubPatchSchool.getCalls()) {
        chai.expect(call.args[1]).to.deep.equal({ add: { schools: [{ id: _ctx.tenantID, roles: ['admin'] }] } });
      }
    }).timeout(10000);

    it('should not let a school admin name another school', async () => {
      const stubSchool = sinon.stub(SchoolsRest, 'getOne');
      const stubGetByEmail = sinon.stub(UsersRest, 'getOneByEmail');

      const res = await UsersAuthSignupService.invite({ email, school: { id: 'school1', role: 'admin' } }, _ctx);

      chai.expect(res.status).to.equal(403);
      chai
        .expect(res.error.message)
        .to.equal('An invitation is for the selected school; only a portal admin can name another school');
      chai.expect(stubSchool.callCount).to.equal(0);
      chai.expect(stubGetByEmail.callCount).to.equal(0);
    }).timeout(10000);

    it('should invite only the admin role and not into the portal school', async () => {
      const stubSchool = sinon.stub(SchoolsRest, 'getOne');
      const stubGetByEmail = sinon.stub(UsersRest, 'getOneByEmail');

      // another school: only admin
      for (const school of [
        { id: 'school1', role: 'professor' },
        { id: 'school1', role: 'portal-admin' },
      ]) {
        const res = await UsersAuthSignupService.invite({ email, school }, portalCtx);
        chai.expect(res.status).to.equal(400);
        chai.expect(res.error.message).to.equal('A portal admin invites only the admins of a school');
      }

      // the portal school (the selected school): only portal-admin, as the normal invite
      const res = await UsersAuthSignupService.invite(
        { email, school: { id: TestConstants.PortalSchoolID, role: 'admin' } },
        portalCtx
      );
      chai.expect(res.status).to.equal(403);
      chai.expect(res.error.message).to.equal('Only the portal-admin role can be given on the portal school');

      chai.expect(stubSchool.callCount).to.equal(0);
      chai.expect(stubGetByEmail.callCount).to.equal(0);
    }).timeout(10000);

    it('should fail for a school that does not exist or an invalid school id', async () => {
      sinon.stub(SchoolsRest, 'getOne').returns({ status: 404, error: { message: 'Not found school9' } });
      const stubGetByEmail = sinon.stub(UsersRest, 'getOneByEmail');

      let res = await UsersAuthSignupService.invite({ email, school: { id: 'school9', role: 'admin' } }, portalCtx);
      chai.expect(res.status).to.equal(404);

      res = await UsersAuthSignupService.invite({ email, school: { id: 'school 1/x', role: 'admin' } }, portalCtx);
      chai.expect(res.status).to.equal(400);

      chai.expect(stubGetByEmail.callCount).to.equal(0);
    }).timeout(10000);
  });

  /**
   * one mailbox is one account: an email in another case is the same account
   */
  it('should invite with the normalized email', async () => {
    const getByEmail = sinon.stub(UsersRest, 'getOneByEmail').returns({ status: 404, error: { message: 'Not found' } });
    const post = sinon.stub(UsersRest, 'post').returns({ status: 201, value: { id: 'user1' } });
    const authPost = sinon.stub(UsersAuthService, 'post').returns({ status: 201, value: { userID: 'user1' } });
    const reset = sinon.stub(UsersAuthService, 'resetPassword').returns({ status: 200, value: true });

    const res = await UsersAuthSignupService.invite(
      { email: ' John.Doe@TestDomain.TEST ', school: { role: 'student' } },
      _ctx
    );

    chai.expect(res).to.deep.equal({
      status: 200,
      value: { username: 'john.doe@testdomain.test', type: UsersAuthRest.Constants.Type },
    });
    chai.expect(getByEmail.firstCall.args[0]).to.equal('john.doe@testdomain.test');
    chai.expect(post.firstCall.args[0].email).to.equal('john.doe@testdomain.test');
    chai.expect(authPost.firstCall.args[0].username).to.equal('john.doe@testdomain.test');
    chai.expect(reset.firstCall.args[0]).to.deep.equal({ username: 'john.doe@testdomain.test' });
  }).timeout(10000);
});
