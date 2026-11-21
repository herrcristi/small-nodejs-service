const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthSessionsService = require('../../../services/users-auth/users-auth.sessions.service.js');
const UsersRest = require('../../../services/rest/users.rest.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };
  const fail = { status: 500, error: { message: 'Database failure' } };

  // the users of the notifications
  const anaPop = { id: 'user1', name: 'Ana Pop', type: 'user', email: 'ana.pop@testdomain.test' };
  const danIon = { id: 'user2', name: 'Dan Ion', type: 'user', email: 'dan.ion@testdomain.test' };

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * a deleted account: its login is deleted, its sessions and links are ended
   */
  it('should remove the login of a deleted account', async () => {
    // stub: the account is still deleted; the login and the sessions
    const stubCurrent = sinon
      .stub(UsersRest, 'getAllByIDs')
      .resolves({ status: 200, value: [{ id: 'user1', status: 'deleted' }] });
    const stubLogin = sinon.stub(DbOpsUtils, 'delete').resolves({ status: 200, value: {} });
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll').resolves({ status: 200, value: 1 });

    // call: the account was deleted, another user was only modified
    const notification = {
      serviceName: 'users',
      modified: [
        { ...anaPop, status: 'deleted', schools: [] },
        { ...danIon, status: 'active' },
      ],
    };
    const res = await UsersAuthService.notification(notification, _ctx);

    // check: only the deleted one, read again, its login (by email) and its sessions
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubCurrent.firstCall.args[0]).to.deep.equal(['user1']);
    chai.expect(stubLogin.callCount).to.equal(1);
    chai.expect(stubLogin.firstCall.args[1]).to.equal(anaPop.email);
    chai.expect(stubEndAll.firstCall.args[0]).to.equal('user1');
  }).timeout(10000);

  /**
   * removed users: only the ones that do not exist anymore lose their login (a removed role keeps it); a late
   * notification of an account created again changes nothing
   */
  it('should remove the login only of the users without an account now', async () => {
    // stub: user1 does not exist anymore, user2 still exists (only a role was removed)
    const current = [{ id: 'user2', status: 'active' }];
    sinon.stub(UsersRest, 'getAllByIDs').resolves({ status: 200, value: current });
    const stubLogin = sinon.stub(DbOpsUtils, 'delete').resolves({ status: 404, error: { message: 'Not found' } });
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll').resolves({ status: 200, value: 0 });

    // call: both removed (user1 twice: once each)
    const notification = { serviceName: 'users', removed: [anaPop, danIon, anaPop] };
    const res = await UsersAuthService.notification(notification, _ctx);

    // check: only user1 (its login was already gone: not an error)
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubLogin.callCount).to.equal(1);
    chai.expect(stubEndAll.firstCall.args[0]).to.equal('user1');

    // case: the deleted account was created again meanwhile (pending): nothing removed
    UsersRest.getAllByIDs.resolves({ status: 200, value: [{ id: 'user1', status: 'pending' }] });
    const deletedLate = { serviceName: 'users', modified: [{ ...anaPop, status: 'deleted' }] };
    const resLate = await UsersAuthService.notification(deletedLate, _ctx);
    chai.expect(resLate).to.deep.equal({ status: 200, value: false });
    chai.expect(stubLogin.callCount).to.equal(1);
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
      modified: [{ ...anaPop, status: 'active' }],
      removed: [{ id: 'user3', name: 'No Email' }],
    };
    const res = await UsersAuthService.notification(notification, _ctx);

    // check
    chai.expect(res).to.deep.equal({ status: 200, value: false });
    chai.expect(stubCurrent.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * failures: the error is returned (the notification can be processed again)
   */
  it('should return the failures of the removal of the logins', async () => {
    // stub: the users can not be read
    const stubCurrent = sinon.stub(UsersRest, 'getAllByIDs').resolves(fail);
    const stubLogin = sinon.stub(DbOpsUtils, 'delete').resolves(fail);
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll').resolves(fail);
    const notification = { serviceName: 'users', removed: [anaPop] };

    // case: the users can not be read
    let res = await UsersAuthService.notification(notification, _ctx);
    chai.expect(res).to.deep.equal(fail);

    // case: the login can not be deleted
    stubCurrent.resolves({ status: 200, value: [] });
    res = await UsersAuthService.notification(notification, _ctx);
    chai.expect(res).to.deep.equal(fail);
    chai.expect(stubEndAll.callCount).to.equal(0);

    // case: the sessions can not be ended
    stubLogin.resolves({ status: 200, value: {} });
    res = await UsersAuthService.notification(notification, _ctx);
    chai.expect(res).to.deep.equal(fail);
  }).timeout(10000);

  /**
   * the notifications of the other services are ignored (no copy of them), an invalid one is refused
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
