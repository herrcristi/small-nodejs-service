const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthServiceLocal = require('../../../services/users-auth/users-local-auth.service.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthSignupService = require('../../../services/users-auth/users-auth.signup.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');

const EventsRest = require('../../../services/rest/events.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const StudentsRest = require('../../../services/rest/students.rest.js');
const ProfessorsRest = require('../../../services/rest/professors.rest.js');
const AdminsRest = require('../../../services/rest/admins.rest.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users', tenantID: 'tenantID1' };

  before(async function () {});

  beforeEach(async function () {
    // the auth record of an existing user exists (an interrupted invite is tested on its own)
    sinon.stub(UsersAuthService, 'ensureAuth').resolves({ status: 200, value: {} });
    // no email of the same type was sent to the user less than EmailInterval ago: it can be sent now
    sinon.stub(UsersAuthServiceLocal, 'putEmailTimestamp').resolves({ status: 200, value: {} });

    // the school has no traces of a deleted account with the invited email (they are tested on their own)
    sinon.stub(StudentsRest, 'relinkTraces').resolves({ status: 200, value: [] });
    sinon.stub(ProfessorsRest, 'relinkTraces').resolves({ status: 200, value: [] });
    sinon.stub(AdminsRest, 'relinkTraces').resolves({ status: 200, value: [] });
  });

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
        id: userReq.id, // a new id, given by the invite
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

    // the real result (the controller answers the same for all of them)
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        username: testUser.email,
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
    // stub: no read and no write are expected
    const stubUsersGetByEmail = sinon.stub(UsersRest, 'getOneByEmail');
    const stubUsersPost = sinon.stub(UsersRest, 'post');

    // call on a normal school
    const res = await UsersAuthSignupService.invite(
      { email: 'big.ben1@testdomain.test', school: { role: UsersRest.Constants.Roles.PortalAdmin } },
      _ctx
    );

    // check: refused before any read
    chai.expect(res.status).to.equal(403);
    chai.expect(res.error.message).to.equal('The portal-admin role can be given only on the portal school');
    chai.expect(stubUsersGetByEmail.callCount).to.equal(0);
    chai.expect(stubUsersPost.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * invite on the portal school accepts only the portal-admin role
   */
  it('should invite fail school role on the portal school', async () => {
    // stub: no read and no write are expected
    const stubUsersGetByEmail = sinon.stub(UsersRest, 'getOneByEmail');
    const stubUsersPost = sinon.stub(UsersRest, 'post');

    // call on the portal school with a school role
    const res = await UsersAuthSignupService.invite(
      { email: 'big.ben1@testdomain.test', school: { role: UsersRest.Constants.Roles.Admin } },
      { ..._ctx, tenantID: TestConstants.PortalSchoolID }
    );

    // check: refused before any read
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

    // stub: a new user (not found), posted as portal admin of the portal school, its login and the email
    sinon
      .stub(UsersRest, 'getOneByEmail')
      .returns({ status: 404, error: { message: 'Not found', error: 'Not found' } });
    const stubUsersPost = sinon.stub(UsersRest, 'post').callsFake((userReq) => {
      chai.expect(userReq).to.deep.equal({
        id: userReq.id, // a new id, given by the invite
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

    // call on the portal school
    const res = await UsersAuthSignupService.invite(
      { email, school: { role: UsersRest.Constants.Roles.PortalAdmin } },
      portalCtx
    );

    // check: the user, its login and the email
    chai.expect(res.status).to.equal(201);
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

    // the real result (the controller answers the same for all of them)
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        username: testUser.email,
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

    // the real result (the controller answers the same for all of them)
    chai.expect(res).to.deep.equal({
      status: 204,
      value: {
        username: testUser.email,
        name: testUser.email,
        type: UsersAuthRest.Constants.Type,
        userID: testUserID,
      },
    });
  }).timeout(10000);

  /**
   * a portal admin invites the admin of a school (school.id): the invite is done for that school
   */
  describe('invite the admin of a school by a portal admin', function () {
    const portalCtx = { ..._ctx, tenantID: TestConstants.PortalSchoolID, userID: 'portalAdmin1' };
    const email = 'school.admin@testdomain.test';

    /**
     * an existing user gets the admin role on the named school, and an invitation that names it
     */
    it('should invite an existing user as admin of the school', async () => {
      // stub: the named school, an existing user of another school, the role change and the email
      const stubSchool = sinon
        .stub(SchoolsRest, 'getOne')
        .returns({ status: 200, value: { id: 'school1', name: 'School One' } });
      sinon.stub(UsersRest, 'getOneByEmail').returns({
        status: 200,
        value: { id: 'user1', email, name: 'School Admin', schools: [{ id: 'school2', roles: ['student'] }] },
      });
      const stubPatchSchool = sinon.stub(UsersRest, 'patchSchool').returns({ status: 200, value: { id: 'user1' } });
      const stubSendInvite = sinon.stub(UsersAuthService, 'sendInvite').returns({ status: 200, value: true });

      // call as a portal admin, for school1
      const res = await UsersAuthSignupService.invite({ email, school: { id: 'school1', role: 'admin' } }, portalCtx);

      // check: the existing user, the school was read
      chai.expect(res).to.deep.equal({
        status: 200,
        value: { userID: 'user1', username: email, name: 'School Admin', type: UsersAuthRest.Constants.Type },
      });
      chai.expect(stubSchool.firstCall.args[0]).to.equal('school1');

      // the role is added on that school, and the invitation names that school
      chai.expect(stubPatchSchool.firstCall.args[1]).to.deep.equal({
        add: { schools: [{ id: 'school1', roles: ['admin'] }] },
      });
      chai.expect(stubPatchSchool.firstCall.args[2]).to.include({ tenantID: 'school1', tenantName: 'School One' });
      chai.expect(stubSendInvite.firstCall.args[1]).to.include({ tenantID: 'school1', tenantName: 'School One' });
    }).timeout(10000);

    /**
     * a new user is created as admin of the named school, and its email names that school
     */
    it('should invite a new user as admin of the school', async () => {
      // stub: the named school, a new user (not found), its post, its login and the email
      sinon.stub(SchoolsRest, 'getOne').returns({ status: 200, value: { id: 'school1', name: 'School One' } });
      sinon.stub(UsersRest, 'getOneByEmail').returns({ status: 404, error: { message: 'Not found' } });
      const stubUsersPost = sinon
        .stub(UsersRest, 'post')
        .returns({ status: 201, value: { id: 'user1', email, type: UsersRest.Constants.Type } });
      sinon.stub(UsersAuthService, 'post').returns({ status: 201, value: { username: email, userID: 'user1' } });
      const stubReset = sinon.stub(UsersAuthService, 'resetPassword').returns({ status: 200, value: true });

      // call as a portal admin, for school1
      const res = await UsersAuthSignupService.invite({ email, school: { id: 'school1', role: 'admin' } }, portalCtx);

      // check: the new user is an admin of school1, the email names it
      chai.expect(res.status).to.equal(201);
      chai.expect(stubUsersPost.firstCall.args[0]).to.deep.equal({
        id: stubUsersPost.firstCall.args[0].id, // a new id, given by the invite
        email,
        schools: [{ id: 'school1', roles: ['admin'] }],
      });
      chai.expect(stubReset.firstCall.args[1]).to.include({ tenantID: 'school1', tenantName: 'School One' });
    }).timeout(10000);

    /**
     * a school admin invites an admin into its selected school, with or without naming it
     */
    it('should let a school admin invite an admin of its own school, also when it names it', async () => {
      // stub: an existing user, the role change and the email; the school is not read
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

      // check: the role is added on the selected school
      chai.expect(stubSchool.callCount).to.equal(0); // the selected school, no lookup
      for (const call of stubPatchSchool.getCalls()) {
        chai.expect(call.args[1]).to.deep.equal({ add: { schools: [{ id: _ctx.tenantID, roles: ['admin'] }] } });
      }
    }).timeout(10000);

    /**
     * a school admin can not invite into another school
     */
    it('should not let a school admin name another school', async () => {
      // stub: no read is expected
      const stubSchool = sinon.stub(SchoolsRest, 'getOne');
      const stubGetByEmail = sinon.stub(UsersRest, 'getOneByEmail');

      // call as a school admin, for another school
      const res = await UsersAuthSignupService.invite({ email, school: { id: 'school1', role: 'admin' } }, _ctx);

      // check: refused before any read
      chai.expect(res.status).to.equal(403);
      chai
        .expect(res.error.message)
        .to.equal('An invitation is for the selected school; only a portal admin can name another school');
      chai.expect(stubSchool.callCount).to.equal(0);
      chai.expect(stubGetByEmail.callCount).to.equal(0);
    }).timeout(10000);

    /**
     * a portal admin invites only the admins of another school, and only portal admins into the portal school
     */
    it('should invite only the admin role and not into the portal school', async () => {
      // stub: no read is expected
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

      // check: nothing was read
      chai.expect(stubSchool.callCount).to.equal(0);
      chai.expect(stubGetByEmail.callCount).to.equal(0);
    }).timeout(10000);

    /**
     * a named school must exist and have a valid id
     */
    it('should fail for a school that does not exist or an invalid school id', async () => {
      // stub: the school is not found; the user is not read
      sinon.stub(SchoolsRest, 'getOne').returns({ status: 404, error: { message: 'Not found school9' } });
      const stubGetByEmail = sinon.stub(UsersRest, 'getOneByEmail');

      // a school that does not exist: 404
      let res = await UsersAuthSignupService.invite({ email, school: { id: 'school9', role: 'admin' } }, portalCtx);
      chai.expect(res.status).to.equal(404);

      // an invalid id: 400
      res = await UsersAuthSignupService.invite({ email, school: { id: 'school 1/x', role: 'admin' } }, portalCtx);
      chai.expect(res.status).to.equal(400);

      // check: the user was not read
      chai.expect(stubGetByEmail.callCount).to.equal(0);
    }).timeout(10000);
  });

  /**
   * one mailbox is one account: an email in another case is the same account
   */
  it('should invite with the normalized email', async () => {
    // stub: a new user, its post, its login and the email
    const getByEmail = sinon.stub(UsersRest, 'getOneByEmail').returns({ status: 404, error: { message: 'Not found' } });
    const post = sinon.stub(UsersRest, 'post').returns({ status: 201, value: { id: 'user1' } });
    const authPost = sinon.stub(UsersAuthService, 'post').returns({ status: 201, value: { userID: 'user1' } });
    const reset = sinon.stub(UsersAuthService, 'resetPassword').returns({ status: 200, value: true });

    // call with an email in mixed case, with spaces
    const res = await UsersAuthSignupService.invite(
      { email: ' John.Doe@TestDomain.TEST ', school: { role: 'student' } },
      _ctx
    );

    // check: the lower-case email is used everywhere
    chai.expect(res).to.deep.equal({ status: 201, value: { userID: 'user1' } });
    chai.expect(getByEmail.firstCall.args[0]).to.equal('john.doe@testdomain.test');
    chai.expect(post.firstCall.args[0].email).to.equal('john.doe@testdomain.test');
    chai.expect(authPost.firstCall.args[0].username).to.equal('john.doe@testdomain.test');
    chai.expect(reset.firstCall.args[0]).to.deep.equal({ username: 'john.doe@testdomain.test' });
  }).timeout(10000);

  describe('the account state decides the email; an interrupted invite is completed', function () {
    const email = 'jane.smith@testdomain.test';
    const existingUser = (status) => ({
      id: 'user1',
      email,
      name: 'Jane Smith',
      status,
      schools: [{ id: _ctx.tenantID, roles: ['student'] }],
    });

    /**
     * a pending user invited again (the first email was lost): a new setup link, not the invitation
     */
    it('should send the setup link to a pending user invited again', async () => {
      // stub: a pending member (the role is there); the emails
      sinon.stub(UsersRest, 'getOneByEmail').resolves({ status: 200, value: existingUser('pending') });
      const stubReset = sinon.stub(UsersAuthService, 'resetPassword').resolves({ status: 200, value: {} });
      const stubInvite = sinon.stub(UsersAuthService, 'sendInvite');

      // call
      const res = await UsersAuthSignupService.invite({ email, school: { role: 'student' } }, _ctx);

      // check: the setup link (a signup link with a new token)
      chai.expect(res.status).to.equal(204);
      chai.expect(stubReset.firstCall.args[2]).to.equal(UsersAuthConstants.ResetTokenType.Signup);
      chai.expect(stubInvite.callCount).to.equal(0);
    }).timeout(10000);

    /**
     * an active user gets the invitation (it has a password)
     */
    it('should send the invitation to an active user', async () => {
      // stub: an active user, the role is added; the email
      sinon.stub(UsersRest, 'getOneByEmail').resolves({ status: 200, value: existingUser('active') });
      sinon.stub(UsersRest, 'patchSchool').resolves({ status: 200, value: {} });
      const stubReset = sinon.stub(UsersAuthService, 'resetPassword');
      const stubInvite = sinon.stub(UsersAuthService, 'sendInvite').resolves({ status: 200, value: {} });

      // call: another role
      const res = await UsersAuthSignupService.invite({ email, school: { role: 'professor' } }, _ctx);

      // check: the invitation
      chai.expect(res.status).to.equal(200);
      chai.expect(stubInvite.callCount).to.equal(1);
      chai.expect(stubReset.callCount).to.equal(0);
    }).timeout(10000);

    /**
     * an invite interrupted after the user was created: its auth record is created now, and it gets the setup link
     */
    it('should complete an interrupted invite: the auth record is created, the setup link is sent', async () => {
      // stub: an active-looking user without auth record (created now: 201)
      sinon.stub(UsersRest, 'getOneByEmail').resolves({ status: 200, value: existingUser('active') });
      UsersAuthService.ensureAuth.resolves({ status: 201, value: { userID: 'user1' } });
      sinon.stub(UsersRest, 'patchSchool').resolves({ status: 200, value: {} });
      const stubReset = sinon.stub(UsersAuthService, 'resetPassword').resolves({ status: 200, value: {} });

      // call
      const res = await UsersAuthSignupService.invite({ email, school: { role: 'professor' } }, _ctx);

      // check: the auth record for the user, then the setup link
      chai.expect(UsersAuthService.ensureAuth.firstCall.args[0]).to.deep.equal({ username: email, userID: 'user1' });
      chai.expect(stubReset.callCount).to.equal(1);
      chai.expect(res.status).to.equal(200);
    }).timeout(10000);

    /**
     * the auth record can not be created: the invite fails (nothing else is changed)
     */
    it('should fail the invite when the auth record can not be created', async () => {
      // stub: the auth record can not be read or created; no role is added
      sinon.stub(UsersRest, 'getOneByEmail').resolves({ status: 200, value: existingUser('active') });
      UsersAuthService.ensureAuth.resolves({ status: 500, error: { message: 'Database failure' } });
      const stubPatch = sinon.stub(UsersRest, 'patchSchool');
      sinon.stub(EventsRest, 'raiseEventForObject');

      // call
      const res = await UsersAuthSignupService.invite({ email, school: { role: 'professor' } }, _ctx);

      // check: the error, no role
      chai.expect(res.status).to.equal(500);
      chai.expect(stubPatch.callCount).to.equal(0);
    }).timeout(10000);

    /**
     * a new email: a new id, the traces of a deleted account with this email in the school are linked to it (students,
     * professors and admins, whatever the role) before the user is created
     */
    it('should invite a new email and link the traces of the school to its new id first', async () => {
      // stub: no user with this email; the new user, its login, the email
      sinon.stub(UsersRest, 'getOneByEmail').resolves({ status: 404, error: { message: 'Not found' } });
      const stubPost = sinon.stub(UsersRest, 'post').callsFake(async (userInfo) => ({ status: 201, value: userInfo }));
      sinon.stub(UsersAuthService, 'post').resolves({ status: 201, value: { userID: 'user1', username: email } });
      sinon.stub(UsersAuthService, 'resetPassword').resolves({ status: 200, value: {} });

      // call
      const res = await UsersAuthSignupService.invite({ email, school: { role: 'student' } }, _ctx);

      // check: the traces of each member service linked to the new id, before the user is created
      chai.expect(res.status).to.equal(201);
      const userID = stubPost.firstCall.args[0].id;
      chai.expect(userID).to.be.a('string');
      for (const membersRest of [StudentsRest, ProfessorsRest, AdminsRest]) {
        chai.expect(membersRest.relinkTraces.firstCall.args[0]).to.deep.equal({ email, userID });
        chai.expect(membersRest.relinkTraces.calledBefore(stubPost)).to.equal(true);
      }

      // case: the traces can not be linked: the invite fails, no user is created (the admins are still linked)
      ProfessorsRest.relinkTraces.resolves({ status: 500, error: { message: 'Database failure' } });
      stubPost.resetHistory();
      sinon.stub(EventsRest, 'raiseEventForObject');
      const resFailed = await UsersAuthSignupService.invite({ email, school: { role: 'student' } }, _ctx);
      chai.expect(resFailed.status).to.equal(500);
      chai.expect(stubPost.callCount).to.equal(0);
      chai.expect(AdminsRest.relinkTraces.callCount).to.equal(2);
    }).timeout(10000);

    /**
     * an existing user (active by another school): the traces of the school are linked to its id before it gets its
     * role; they can not be linked: the invite fails, no role is added
     */
    it('should invite an existing user and link the traces of the school to its id first', async () => {
      // stub: an active user; the role is added
      sinon.stub(UsersRest, 'getOneByEmail').resolves({ status: 200, value: existingUser('active') });
      const stubPatch = sinon.stub(UsersRest, 'patchSchool').resolves({ status: 200, value: {} });
      sinon.stub(UsersAuthService, 'sendInvite').resolves({ status: 200, value: {} });

      // call
      const res = await UsersAuthSignupService.invite({ email, school: { role: 'professor' } }, _ctx);

      // check: linked to the id of the user, before the role
      chai.expect(res.status).to.equal(200);
      chai.expect(AdminsRest.relinkTraces.firstCall.args[0]).to.deep.equal({ email, userID: 'user1' });
      chai.expect(AdminsRest.relinkTraces.calledBefore(stubPatch)).to.equal(true);

      // case: the traces can not be linked (the professors and the admins are still linked)
      StudentsRest.relinkTraces.resolves({ status: 500, error: { message: 'Database failure' } });
      stubPatch.resetHistory();
      sinon.stub(EventsRest, 'raiseEventForObject');
      const resFailed = await UsersAuthSignupService.invite({ email, school: { role: 'professor' } }, _ctx);
      chai.expect(resFailed.status).to.equal(500);
      chai.expect(stubPatch.callCount).to.equal(0);
      chai.expect(ProfessorsRest.relinkTraces.callCount).to.equal(2);
      chai.expect(AdminsRest.relinkTraces.callCount).to.equal(2);
    }).timeout(10000);
  });
});
