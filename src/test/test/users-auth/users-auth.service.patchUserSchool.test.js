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
    const stubPatch = sinon.stub(UsersRest, 'patchSchool');

    let res = await UsersAuthService.patchUserSchool('user1', { add: { roles: ['portal-admin'] } }, _ctx);
    chai.expect(res.status).to.equal(403);
    chai.expect(res.error.message).to.equal('The portal-admin role can be given only on the portal school');

    res = await UsersAuthService.patchUserSchool(
      'user1',
      { remove: { roles: ['admin'] } },
      { ..._ctx, tenantID: TestConstants.PortalSchoolID }
    );
    chai.expect(res.status).to.equal(403);
    chai.expect(res.error.message).to.equal('Only the portal-admin role can be given on the portal school');

    chai.expect(stubPatch.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * patchUserSchool remove another portal admin, but not itself
   */
  it('should patchUserSchool remove another portal admin but skip removing itself', async () => {
    const portalCtx = { ..._ctx, tenantID: TestConstants.PortalSchoolID, userID: 'portal-admin-1' };
    const stubPatch = sinon.stub(UsersRest, 'patchSchool').resolves({ status: 200, value: {} });

    await UsersAuthService.patchUserSchool('portal-admin-2', { remove: { roles: ['portal-admin'] } }, portalCtx);
    chai.expect(stubPatch.callCount).to.equal(1);
    chai.expect(stubPatch.firstCall.args[0]).to.equal('portal-admin-2');
    chai.expect(stubPatch.firstCall.args[1]).to.deep.equal({
      remove: { schools: [{ id: TestConstants.PortalSchoolID, roles: ['portal-admin'] }] },
    });

    // itself: the role is skipped, nothing to patch
    await UsersAuthService.patchUserSchool('portal-admin-1', { remove: { roles: ['portal-admin'] } }, portalCtx);
    chai.expect(stubPatch.secondCall.args[1]).to.deep.equal({});
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

    // stub
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

    // stub
    let stubUserDetails = sinon.stub(UsersRest, 'patchSchool').callsFake((objID, patchInfo) => {
      console.log(`\nUsersRest.patchSchool called ${JSON.stringify({ objID, patchInfo }, null, 2)}\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    _ctx.userID = testUser.userID;
    _ctx.username = testUser.id;
    let res = await UsersAuthService.patchUserSchool(testUser.userID, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUserDetails.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error') },
    });
  }).timeout(10000);
});
