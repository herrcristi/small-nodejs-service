const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const JwtUtils = require('../../../core/utils/jwt.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const UsersLocalAuthService = require('../../../services/users-auth/users-local-auth.service.js');
const UsersAuthSessionsService = require('../../../services/users-auth/users-auth.sessions.service.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * logout with success
   */
  it('should logout with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub: the record of the session is removed; the account is not changed, the other sessions are not ended
    const stubEnd = sinon.stub(UsersAuthSessionsService, 'end').resolves({ status: 200, value: { id: 'session-id1' } });
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll');
    const stubPut = sinon.stub(DbOpsUtils, 'put');

    // call in the session
    _ctx.userID = testUser.userID;
    _ctx.username = testUser.id;
    _ctx.sessionID = 'session-id1';
    let res = await UsersAuthService.logout(_ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: only this session is ended
    chai.expect(stubEnd.firstCall.args[0]).to.equal('session-id1');
    chai.expect(stubEndAll.callCount).to.equal(0);
    chai.expect(stubPut.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({ status: 200, value: {} });
  }).timeout(10000);

  /**
   * logout of a session that was already ended (another logout, a password change): a success
   */
  it('should logout with success when the session was already ended', async () => {
    // stub: no record of the session
    sinon.stub(UsersAuthSessionsService, 'end').resolves({ status: 404, error: { message: 'Not found session-id1' } });

    // call
    const res = await UsersAuthService.logout({ ..._ctx, sessionID: 'session-id1' });

    // check
    chai.expect(res).to.deep.equal({ status: 200, value: {} });
  }).timeout(10000);

  /**
   * logout fails when the session can not be ended
   */
  it('should logout fail when the session can not be ended', async () => {
    // stub: the record of the session can not be removed
    const testUser = _.cloneDeep(TestConstants.UsersAuth)[0];
    sinon.stub(UsersAuthSessionsService, 'end').resolves({ status: 500, error: { message: 'Test error message' } });

    // call as the user
    _ctx.userID = testUser.userID;
    _ctx.username = testUser.id;
    const res = await UsersAuthService.logout(_ctx);

    // check: the error is returned
    chai.expect(res.status).to.equal(500);
  }).timeout(10000);
});
