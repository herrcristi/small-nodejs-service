const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const JwtUtils = require('../../../core/utils/jwt.utils.js');

const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthSessionsService = require('../../../services/users-auth/users-auth.sessions.service.js');
const UsersLocalAuthService = require('../../../services/users-auth/users-local-auth.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

/**
 * the sessions of a user: a new one at login, all ended by a password change, an email change or a removed account
 * (this session continues after a password change), and the failures of these steps
 */
describe('Users Auth Service sessions', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', userID: 'user1', username: 'user@testdomain.test' };
  const session = { id: 'session-id2', secret: 'secret2', expiresAt: new Date(Date.now() + 60 * 1000) };
  const fail = { status: 500, error: { message: 'Test error message', error: new Error('Test error message') } };

  beforeEach(function () {
    // the events and the notifications
    sinon.stub(EventsRest, 'raiseEventForObject');
    sinon.stub(UsersAuthRest, 'raiseNotification');
  });

  afterEach(function () {
    sinon.restore();
  });

  /**
   * a password change ends all the sessions of the user, then this session continues with a new one
   */
  it('should putPassword end all the sessions and start a new one', async () => {
    // stub: the password is changed, the sessions are ended, a new session
    sinon.stub(UsersLocalAuthService, 'putPassword').resolves({ status: 200, value: { id: _ctx.username } });
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll').resolves({ status: 200, value: 3 });
    const stubCreate = sinon.stub(UsersAuthSessionsService, 'create').resolves({ status: 201, value: session });

    // call
    const putReq = { oldPassword: 'Password1!', newPassword: 'Password2!' };
    const res = await UsersAuthService.putPassword(putReq, { ..._ctx });

    // check: all the sessions of the user were ended before the new one
    chai.expect(res.status).to.equal(200);
    chai.expect(stubEndAll.firstCall.args[0]).to.equal('user1');
    chai
      .expect(stubCreate.firstCall.args.slice(0, 2))
      .to.deep.equal(['session', { userID: 'user1', username: 'user@testdomain.test' }]);
    chai.expect(stubEndAll.calledBefore(stubCreate)).to.equal(true);

    // the new token carries the secret of the new session
    const decrypted = JwtUtils.decrypt(res.token, UsersAuthConstants.ServiceName, _ctx);
    const r = await UsersLocalAuthService.validateToken({}, { token: decrypted.value }, _ctx);
    chai.expect(r.value).to.include({ purpose: 'session', username: _ctx.username, secret: 'secret2' });
  }).timeout(10000);

  /**
   * a password change fails when the sessions can not be ended, or the new session can not be started
   */
  it('should putPassword fail when the sessions can not be ended or started', async () => {
    // stub: the password is changed; ending the sessions fails
    sinon.stub(UsersLocalAuthService, 'putPassword').resolves({ status: 200, value: { id: _ctx.username } });
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll').resolves(fail);
    const stubCreate = sinon.stub(UsersAuthSessionsService, 'create').resolves(fail);
    const putReq = { oldPassword: 'Password1!', newPassword: 'Password2!' };

    // the sessions can not be ended: no new session
    let res = await UsersAuthService.putPassword(putReq, { ..._ctx });
    chai.expect(res.status).to.equal(500);
    chai.expect(stubCreate.callCount).to.equal(0);

    // the new session can not be started
    stubEndAll.resolves({ status: 200, value: 1 });
    res = await UsersAuthService.putPassword(putReq, { ..._ctx });
    chai.expect(res.status).to.equal(500);
    chai.expect(res.token).to.equal(undefined);
  }).timeout(10000);

  /**
   * an email change ends all the sessions of the user (they have the old email); the failure is returned
   */
  it('should putID end all the sessions of the user', async () => {
    // stub: the email is changed in the auth and in the user details, the sessions are ended
    sinon.stub(UsersLocalAuthService, 'putID').resolves({ status: 200, value: { id: 'new.email@testdomain.test' } });
    sinon.stub(UsersRest, 'putEmail').resolves({ status: 200, value: { id: 'user1' } });
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll').resolves({ status: 200, value: 2 });

    // call
    const putReq = { username: 'new.email@testdomain.test', password: 'Password1!' };
    let res = await UsersAuthService.putID(putReq, { ..._ctx });

    // check: all the sessions of the user were ended
    chai.expect(res.status).to.equal(200);
    chai.expect(stubEndAll.firstCall.args[0]).to.equal('user1');

    // the sessions can not be ended: the error
    stubEndAll.resolves(fail);
    res = await UsersAuthService.putID(putReq, { ..._ctx });
    chai.expect(res.status).to.equal(500);
  }).timeout(10000);

  /**
   * a removed account ends all its sessions and links; the failure is returned
   */
  it('should delete end all the sessions of the user', async () => {
    // stub: the account is deleted, its login is removed, the sessions are ended
    sinon.stub(UsersRest, 'deleteAccount').resolves({ status: 200, value: { id: 'user1' } });
    sinon.stub(UsersLocalAuthService, 'delete').resolves({ status: 200, value: { id: _ctx.username } });
    const stubEndAll = sinon.stub(UsersAuthSessionsService, 'endAll').resolves({ status: 200, value: 1 });

    // call
    let res = await UsersAuthService.delete({ ..._ctx });

    // check: all the sessions of the user were ended
    chai.expect(res.status).to.equal(200);
    chai.expect(stubEndAll.firstCall.args[0]).to.equal('user1');

    // the sessions can not be ended: the error
    stubEndAll.resolves(fail);
    res = await UsersAuthService.delete({ ..._ctx });
    chai.expect(res.status).to.equal(500);
  }).timeout(10000);

  /**
   * a login fails when its session can not be started
   */
  it('should login fail when the session can not be started', async () => {
    // stub: the password is right, the user is active; the session can not be started
    sinon.stub(UsersLocalAuthService, 'login').resolves({ status: 200, value: { id: _ctx.username } });
    sinon.stub(UsersRest, 'getOneByEmail').resolves({ status: 200, value: { id: 'user1', status: 'active' } });
    sinon.stub(UsersAuthSessionsService, 'create').resolves(fail);

    // call
    const res = await UsersAuthService.login({ username: _ctx.username, password: 'Password1!' }, { ..._ctx });

    // check: the error, no token
    chai.expect(res.status).to.equal(500);
    chai.expect(res.token).to.equal(undefined);
  }).timeout(10000);

  /**
   * a logout fails when the provider fails (the session is not ended)
   */
  it('should logout fail when the provider fails', async () => {
    // stub: the provider fails; the session is not ended
    sinon.stub(UsersLocalAuthService, 'logout').resolves(fail);
    const stubEnd = sinon.stub(UsersAuthSessionsService, 'end');

    // call
    const res = await UsersAuthService.logout({ ..._ctx, sessionID: 'session-id1' });

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubEnd.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * a reset password email is not sent when its link can not be recorded
   */
  it('should resetPassword fail when the link can not be recorded', async () => {
    // stub: the account exists; the link can not be recorded
    sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: { id: _ctx.username, userID: 'user1' } });
    const stubCreate = sinon.stub(UsersAuthSessionsService, 'create').resolves(fail);
    const stubSend = sinon.stub(UsersLocalAuthService, 'sendEmail');

    // call
    const res = await UsersAuthService.resetPassword({ username: _ctx.username }, { ..._ctx });

    // check: the error, no email
    chai.expect(res.status).to.equal(500);
    chai
      .expect(stubCreate.firstCall.args.slice(0, 2))
      .to.deep.equal(['reset-password', { userID: 'user1', username: _ctx.username }]);
    chai.expect(stubSend.callCount).to.equal(0);
  }).timeout(10000);
});
