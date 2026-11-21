const _ = require('lodash');
const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthSessionsService = require('../../../services/users-auth/users-auth.sessions.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };
  const fail = { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };

  before(async function () {});

  beforeEach(async function () {
    // the current user
    const testUser = TestConstants.UsersAuth[0];
    _ctx.userID = testUser.userID;
    _ctx.username = testUser.id;
  });

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * delete the account: the user first (deleted, it can not log in), then its login, its sessions, the event and the
   * notification
   */
  it('should delete with success', async () => {
    const testUser = _.cloneDeep(TestConstants.UsersAuth[0]);

    // stub: the user is deleted, the login is removed, the sessions are ended
    const stubAccount = sinon.stub(UsersRest, 'delete').resolves({ status: 200, value: { id: testUser.userID } });
    const stubLogin = sinon.stub(DbOpsUtils, 'delete').resolves({ status: 200, value: { ...testUser } });
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll').resolves({ status: 200, value: 1 });
    const stubEvents = sinon.stub(EventsRest, 'raiseEventForObject');
    const stubNotification = sinon.stub(UsersAuthRest, 'raiseNotification');

    // call
    const res = await UsersAuthService.delete(_ctx);

    // check: in this order, for the current user
    chai.expect(stubAccount.firstCall.args[0]).to.equal(testUser.userID);
    chai.expect(stubLogin.firstCall.args[1]).to.equal(testUser.id);
    chai.expect(stubAccount.calledBefore(stubLogin)).to.equal(true);
    chai.expect(stubEndAll.firstCall.args[0]).to.equal(testUser.userID);
    chai.expect(stubEvents.callCount).to.equal(1);
    chai.expect(stubNotification.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { userID: testUser.userID, username: testUser.id, type: testUser.type },
    });
  }).timeout(10000);

  /**
   * the user can not be deleted: the error, the login is kept
   */
  it('should delete fail when the account can not be deleted', async () => {
    // stub: the user can not be deleted
    sinon.stub(UsersRest, 'delete').resolves(fail);
    const stubLogin = sinon.stub(DbOpsUtils, 'delete');

    // call
    const res = await UsersAuthService.delete(_ctx);

    // check: the error, nothing else
    chai.expect(res).to.deep.equal(fail);
    chai.expect(stubLogin.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * the login can not be removed: the error (the user is deleted: it can not log in anyway); a login that does not
   * exist anymore is not an error
   */
  it('should delete fail when the login can not be removed, and ignore a missing login', async () => {
    // stub: the user is deleted; the login can not be removed
    sinon.stub(UsersRest, 'delete').resolves({ status: 200, value: {} });
    const stubLogin = sinon.stub(DbOpsUtils, 'delete').resolves(fail);
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll').resolves({ status: 200, value: 1 });
    sinon.stub(EventsRest, 'raiseEventForObject');
    sinon.stub(UsersAuthRest, 'raiseNotification');

    // call
    const res = await UsersAuthService.delete(_ctx);

    // check: the error, the sessions are not ended here
    chai.expect(res).to.deep.equal(fail);
    chai.expect(stubEndAll.callCount).to.equal(0);

    // case: the login does not exist anymore: done
    stubLogin.resolves({ status: 404, error: { message: 'Not found' } });
    const resMissing = await UsersAuthService.delete(_ctx);
    chai.expect(resMissing.status).to.equal(200);
    chai.expect(stubEndAll.callCount).to.equal(1);
  }).timeout(10000);
});
