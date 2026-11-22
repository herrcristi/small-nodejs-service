const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

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
   * patchUserSchool portal-admin role only on the portal school
   */
  it('should patchUserSchool fail portal-admin role on a normal school and other roles on the portal school', async () => {
    // stub: no write is expected
    const stubPatch = sinon.stub(UsersRest, 'patchSchool');

    // portal-admin on a normal school: refused
    let res = await UsersAuthService.patchUserSchool('user1', { add: { roles: ['portal-admin'] } }, _ctx);
    chai.expect(res.status).to.equal(403);
    chai.expect(res.error.message).to.equal('The portal-admin role can be given only on the portal school');

    // another role on the portal school: refused
    res = await UsersAuthService.patchUserSchool(
      'user1',
      { remove: { roles: ['admin'] } },
      { ..._ctx, tenantID: TestConstants.PortalSchoolID }
    );
    chai.expect(res.status).to.equal(403);
    chai.expect(res.error.message).to.equal('Only the portal-admin role can be given on the portal school');

    // check: nothing was written
    chai.expect(stubPatch.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * patchUserSchool removes a portal admin, also itself (no portal admin is kept on purpose: the configured one is
   * invited again at the next start)
   */
  it('should patchUserSchool remove another portal admin and also itself', async () => {
    // stub: both are portal admins; the write
    const portalCtx = { ..._ctx, tenantID: TestConstants.PortalSchoolID, userID: 'portal-admin-1' };
    sinon.stub(UsersRest, 'getAllByIDs').callsFake(async ([userID]) => ({
      status: 200,
      value: [{ id: userID, schools: [{ id: TestConstants.PortalSchoolID, roles: ['portal-admin'] }] }],
    }));
    const stubPatch = sinon.stub(UsersRest, 'patchSchool').resolves({ status: 200, value: {} });

    // another portal admin: its role on the portal school is removed
    await UsersAuthService.patchUserSchool('portal-admin-2', { remove: { roles: ['portal-admin'] } }, portalCtx);
    chai.expect(stubPatch.callCount).to.equal(1);
    chai.expect(stubPatch.firstCall.args[0]).to.equal('portal-admin-2');
    chai.expect(stubPatch.firstCall.args[1]).to.deep.equal({
      remove: { schools: [{ id: TestConstants.PortalSchoolID, roles: ['portal-admin'] }] },
    });

    // itself: removed too
    const res = await UsersAuthService.patchUserSchool(
      'portal-admin-1',
      { remove: { roles: ['portal-admin'] } },
      portalCtx
    );
    chai.expect(res.status).to.equal(200);
    chai.expect(stubPatch.callCount).to.equal(2);
    chai.expect(stubPatch.secondCall.args[0]).to.equal('portal-admin-1');
  }).timeout(10000);

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

    // stub: the user is a student of the school; the write
    sinon.stub(UsersRest, 'getAllByIDs').resolves({
      status: 200,
      value: [{ id: testUser.userID, schools: [{ id: _ctx.tenantID, roles: ['student'] }] }],
    });
    let stubUserDetails = sinon.stub(UsersRest, 'patchSchool').callsFake((objID, patchInfo) => {
      console.log(`\nUsersRest.patchSchool called ${JSON.stringify({ objID, patchInfo }, null, 2)}\n`);
      return { status: 200, value: { id: testUser.userID } };
    });

    // call
    _ctx.userID = testUser.userID;
    _ctx.username = testUser.id;
    let res = await UsersAuthService.patchUserSchool(testUser.userID, patchReq, _ctx);
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
   * patchUserSchool fail when an admin removes itself as admin
   */
  it('should patchUserSchool fail when the admin removes itself as admin', async () => {
    // stub: no write is expected
    const testUser = _.cloneDeep(TestConstants.UsersAuth)[0];
    const stubUserDetails = sinon.stub(UsersRest, 'patchSchool');

    // call as the admin, on itself
    _ctx.userID = testUser.userID;
    _ctx.username = testUser.id;
    const res = await UsersAuthService.patchUserSchool(testUser.userID, { remove: { roles: ['admin'] } }, _ctx);

    // check: refused, nothing written
    chai.expect(stubUserDetails.callCount).to.equal(0);
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('You cannot remove yourself as admin');
  }).timeout(10000);

  /**
   * patchUserSchool the admin can remove its other roles
   */
  it('should patchUserSchool with success when the admin removes another own role', async () => {
    // stub: the admin is also a student of the school; the write
    const testUser = _.cloneDeep(TestConstants.UsersAuth)[0];
    sinon.stub(UsersRest, 'getAllByIDs').resolves({
      status: 200,
      value: [{ id: testUser.userID, schools: [{ id: _ctx.tenantID, roles: ['admin', 'student'] }] }],
    });
    const stubUserDetails = sinon
      .stub(UsersRest, 'patchSchool')
      .resolves({ status: 200, value: { id: testUser.userID } });

    // call as the admin, on itself, for another role
    _ctx.userID = testUser.userID;
    _ctx.username = testUser.id;
    const res = await UsersAuthService.patchUserSchool(testUser.userID, { remove: { roles: ['student'] } }, _ctx);

    // check: the role is removed on the current school
    chai.expect(stubUserDetails.callCount).to.equal(1);
    chai.expect(stubUserDetails.firstCall.args[1]).to.deep.equal({
      remove: { schools: [{ id: _ctx.tenantID, roles: ['student'] }] },
    });
    chai.expect(res.status).to.equal(200);
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
    _ctx.userID = testUser.userID;
    _ctx.username = testUser.id;
    let res = await UsersAuthService.patchUserSchool(testUser.userID, patchReq, _ctx);
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

    // stub: the other user is an admin of the school; the write fails
    sinon.stub(UsersRest, 'getAllByIDs').resolves({
      status: 200,
      value: [{ id: 'another-user-id', schools: [{ id: _ctx.tenantID, roles: ['admin'] }] }],
    });
    let stubUserDetails = sinon.stub(UsersRest, 'patchSchool').callsFake((objID, patchInfo) => {
      console.log(`\nUsersRest.patchSchool called ${JSON.stringify({ objID, patchInfo }, null, 2)}\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    _ctx.userID = testUser.userID;
    _ctx.username = testUser.id;
    // remove the admin role of another user
    let res = await UsersAuthService.patchUserSchool('another-user-id', patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUserDetails.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error') },
    });
  }).timeout(10000);

  /**
   * patchUserSchool only for a real change of a member: a user that is not a member of the school is not found, a
   * patch that changes no role is refused (no write, no event, no notification for nothing)
   */
  it('should patchUserSchool refuse a user that is not a member and a patch that changes nothing', async () => {
    // stub: user1 is a student of the school, user2 is a member of another school only; no write is expected
    sinon.stub(UsersRest, 'getAllByIDs').callsFake(async ([userID]) => {
      const schools = {
        user1: [{ id: _ctx.tenantID, roles: ['student'] }],
        user2: [{ id: 'other-school', roles: ['admin'] }],
      };
      // user3 does not exist
      return { status: 200, value: userID === 'user3' ? [] : [{ id: userID, schools: schools[userID] }] };
    });
    const stubPatch = sinon.stub(UsersRest, 'patchSchool');
    const adminCtx = { ..._ctx, userID: 'admin1', username: 'admin@testdomain.test' };

    // case: a user that is not a member of the school
    let res = await UsersAuthService.patchUserSchool('user2', { remove: { roles: ['admin'] } }, adminCtx);
    chai.expect(res.status).to.equal(404);
    chai.expect(res.error.message).to.equal('The user is not a member of this school');

    // case: a user that does not exist
    res = await UsersAuthService.patchUserSchool('user3', { remove: { roles: ['admin'] } }, adminCtx);
    chai.expect(res.status).to.equal(404);

    // case: a role it has already, a role it does not have
    res = await UsersAuthService.patchUserSchool('user1', { add: { roles: ['student'] } }, adminCtx);
    chai.expect(res.status).to.equal(400);
    res = await UsersAuthService.patchUserSchool('user1', { remove: { roles: ['professor'] } }, adminCtx);
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Nothing to change');

    // case: an empty patch
    res = await UsersAuthService.patchUserSchool('user1', {}, adminCtx);
    chai.expect(res.status).to.equal(400);

    // check: nothing was written
    chai.expect(stubPatch.callCount).to.equal(0);

    // case: the user can not be read
    UsersRest.getAllByIDs.resolves({ status: 500, error: { message: 'Database failure' } });
    res = await UsersAuthService.patchUserSchool('user1', { remove: { roles: ['student'] } }, adminCtx);
    chai.expect(res.status).to.equal(500);
  }).timeout(10000);
});
