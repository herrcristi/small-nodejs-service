const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthSessionsService = require('../../../services/users-auth/users-auth.sessions.service.js');
const UsersRest = require('../../../services/rest/users.rest.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };
  const fail = { status: 500, error: { message: 'Database failure' } };

  // the users of the notifications: deleted by the users service (the status of its answer), or with a removed role
  const janeSmith = {
    id: 'user1',
    name: 'Jane Smith',
    type: 'user',
    email: 'jane.smith@testdomain.test',
    status: 'deleted',
  };
  const johnBrown = {
    id: 'user2',
    name: 'John Brown',
    type: 'user',
    email: 'john.brown@testdomain.test',
    status: 'deleted',
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * modified users keep their login (a deleted user is removed, see the next tests)
   */
  it('should keep the login of the modified users', async () => {
    // stub: the users and the logins are not read
    const stubCurrent = sinon.stub(UsersRest, 'getAllByIDs');
    const stubLogin = sinon.stub(DbOpsUtils, 'delete');

    // call: a modified user
    const notification = { serviceName: 'users', modified: [{ ...johnBrown, status: 'active' }] };
    const res = await UsersAuthService.notification(notification, _ctx);

    // check: nothing done
    chai.expect(res).to.deep.equal({ status: 200, value: false });
    chai.expect(stubCurrent.callCount).to.equal(0);
    chai.expect(stubLogin.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * removed users: only the ones that do not exist anymore lose their login (a removed role keeps it); the status of
   * the notification tells it (the answer of the delete), the users are not read again (a secondary may still have a
   * deleted user)
   */
  it('should remove the login only of the users without an account now', async () => {
    // stub: user1 does not exist anymore, user2 still exists (only a role was removed)
    const stubCurrent = sinon.stub(UsersRest, 'getAllByIDs');
    const stubLogin = sinon.stub(DbOpsUtils, 'delete').resolves({ status: 404, error: { message: 'Not found' } });
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll').resolves({ status: 200, value: 0 });

    // call: both removed (user1 twice: once each)
    const roleRemoved = { ...johnBrown, status: 'active' };
    const notification = { serviceName: 'users', removed: [janeSmith, roleRemoved, janeSmith] };
    const res = await UsersAuthService.notification(notification, _ctx);

    // check: only user1 (its login was already gone: not an error), no user read
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubLogin.callCount).to.equal(1);
    chai.expect(stubEndAll.firstCall.args[0]).to.equal('user1');
    chai.expect(stubCurrent.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * nothing to remove: no users are read
   */
  it('should do nothing for users that keep their account', async () => {
    // stub
    const stubCurrent = sinon.stub(UsersRest, 'getAllByIDs');

    // call: an active user, a user without email
    const notification = {
      serviceName: 'users',
      modified: [{ ...janeSmith, status: 'active' }],
      removed: [{ id: 'user3', name: 'No Email' }],
    };
    const res = await UsersAuthService.notification(notification, _ctx);

    // check
    chai.expect(res).to.deep.equal({ status: 200, value: false });
    chai.expect(stubCurrent.callCount).to.equal(0);

    // case: only a role of the user was removed (the user still exists, its status is not deleted): its login is kept
    const roleRemoved = { serviceName: 'users', removed: [{ ...janeSmith, status: 'active' }] };
    chai.expect(await UsersAuthService.notification(roleRemoved, _ctx)).to.deep.equal({ status: 200, value: false });
    chai.expect(stubCurrent.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * failures: the error is returned (the notification can be processed again)
   */
  it('should return the failures of the removal of the logins', async () => {
    // stub: the database fails
    const stubLogin = sinon.stub(DbOpsUtils, 'delete').resolves(fail);
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll').resolves(fail);
    const notification = { serviceName: 'users', removed: [janeSmith] };

    // case: the login can not be deleted
    let res = await UsersAuthService.notification(notification, _ctx);
    chai.expect(res).to.deep.equal(fail);
    chai.expect(stubEndAll.callCount).to.equal(0);

    // case: the sessions can not be ended
    stubLogin.resolves({ status: 200, value: {} });
    res = await UsersAuthService.notification(notification, _ctx);
    chai.expect(res).to.deep.equal(fail);
  }).timeout(10000);

  /**
   * a failure does not stop the removal of the logins: the next users are still done, and the first failure is
   * returned at the end
   */
  it('should remove the next logins after a failure', async () => {
    // stub: user1 and user2 do not exist anymore; the login of user1 can not be deleted
    const stubLogin = sinon.stub(DbOpsUtils, 'delete');
    stubLogin.onFirstCall().resolves(fail);
    stubLogin.onSecondCall().resolves({ status: 200, value: {} });
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll').resolves({ status: 200, value: 1 });

    // call
    const notification = { serviceName: 'users', removed: [janeSmith, johnBrown] };
    const res = await UsersAuthService.notification(notification, _ctx);

    // check: the first failure is returned, the login and the sessions of user2 are still removed
    chai.expect(res).to.deep.equal(fail);
    chai.expect(stubLogin.callCount).to.equal(2);
    chai.expect(stubEndAll.args.map((args) => args[0])).to.deep.equal(['user2']);
  }).timeout(10000);

  /**
   * the notifications of the other services are ignored (no reference to them), an invalid one is refused
   */
  it('should ignore other services and refuse an invalid notification', async () => {
    // call: another service
    const res = await UsersAuthService.notification({ serviceName: 'schools', modified: [{ id: 'school1' }] }, _ctx);
    chai.expect(res).to.deep.equal({ status: 200, value: false });

    // call: no service name
    const resInvalid = await UsersAuthService.notification({ modified: [{ id: 'user1' }] }, _ctx);
    chai.expect(resInvalid.status).to.equal(400);
    chai.expect(resInvalid.error.message).to.equal('Failed to validate schema. Error: "serviceName" is required');
  }).timeout(10000);
});
