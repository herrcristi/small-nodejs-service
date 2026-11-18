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

    // stub: the account gets a new session key
    const stubPut = sinon.stub(DbOpsUtils, 'put').returns({ status: 200, value: { id: testUser.id } });

    // call
    _ctx.userID = testUser.userID;
    _ctx.username = testUser.id;
    let res = await UsersAuthService.logout(_ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the sessions of the account are ended by the new key
    chai.expect(stubPut.firstCall.args[1]).to.equal(testUser.id);
    chai.expect(stubPut.firstCall.args[2].sessionKey).to.be.a('string').with.length(32);
    chai.expect(stubPut.firstCall.args[2].sessionKey).to.not.equal(testUser.sessionKey);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {},
      token: 'token',
    });
  }).timeout(10000);

  /**
   * logout fails when the sessions can not be ended
   */
  it('should logout fail when the session key can not be changed', async () => {
    // stub: the new session key can not be saved
    const testUser = _.cloneDeep(TestConstants.UsersAuth)[0];
    sinon.stub(DbOpsUtils, 'put').returns({ status: 500, error: { message: 'Test error message' } });

    // call as the user
    _ctx.userID = testUser.userID;
    _ctx.username = testUser.id;
    const res = await UsersAuthService.logout(_ctx);

    // check: the error is returned
    chai.expect(res.status).to.equal(500);
  }).timeout(10000);
});
