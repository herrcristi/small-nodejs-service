const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const JwtUtils = require('../../../core/utils/jwt.utils.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthDatabase = require('../../../services/users-auth/users-local-auth.database.js');
const UsersLocalAuthService = require('../../../services/users-auth/users-local-auth.service.js');

/**
 * the session token: only a session token opens a session, and only while its key is the key of the account
 */
describe('Users Local Auth Service session', function () {
  const _ctx = { reqID: 'testReq', lang: 'en' };
  const config = { serviceName: UsersAuthConstants.ServiceName };
  const issuer = `${UsersAuthConstants.ServiceName}-local`;
  const userInfo = { username: 'user@testdomain.test', userID: 'user1', sessionKey: 'session1' };

  beforeEach(function () {
    sinon.stub(UsersAuthDatabase, 'collection').resolves(null);
  });

  afterEach(function () {
    sinon.restore();
  });

  /**
   * a session token carries its purpose and the session key
   */
  it('should make a session token that validates as a session', async () => {
    // a session token
    const rT = await UsersLocalAuthService.getToken(config, userInfo, _ctx);

    // call
    const r = await UsersLocalAuthService.validateToken(config, { token: rT.value }, _ctx);

    // check: a session, with its key
    chai.expect(r.status).to.equal(200);
    chai.expect(r.value).to.include({ purpose: 'session', username: userInfo.username, session: 'session1' });
  });

  /**
   * only a session token opens a session
   */
  it('should not accept a reset token or an invalid token as a session', async () => {
    // a reset token: refused
    const resetToken = JwtUtils.getJwt({ purpose: 'reset-password', username: userInfo.username }, issuer, _ctx, '1h');
    let r = await UsersLocalAuthService.validateToken(config, { token: resetToken.value }, _ctx);
    chai.expect(r.status).to.equal(401);
    chai.expect(r.error.message).to.equal('Not a session token');

    // not a token: refused
    r = await UsersLocalAuthService.validateToken(config, { token: 'not a token' }, _ctx);
    chai.expect(r.status).to.equal(401);
  });

  /**
   * a session is open only while its key is the key of the account
   */
  it('should keep a session open only while its key is the key of the account', async () => {
    // stub: the stored account changes in the steps
    const getOne = sinon.stub(DbOpsUtils, 'getOne');
    const tokenData = { username: userInfo.username, session: 'session1' };

    // the same key: open
    getOne.returns({ status: 200, value: { id: userInfo.username, sessionKey: 'session1' } });
    let r = await UsersLocalAuthService.checkSession(config, tokenData, _ctx);
    chai.expect(r.status).to.equal(200);

    // a new key (logout, password change, password reset, email change), no key, or no account: ended
    for (const value of [
      { status: 200, value: { id: userInfo.username, sessionKey: 'session2' } },
      { status: 200, value: { id: userInfo.username } },
      { status: 404, error: { message: 'Not found' } },
    ]) {
      getOne.returns(value);
      r = await UsersLocalAuthService.checkSession(config, tokenData, _ctx);
      chai.expect(r.status).to.equal(401);
      chai.expect(r.error.message).to.equal('The session has ended');
    }
  });

  /**
   * logout gives the account a new key, so all its sessions end
   */
  it('should end the sessions of the account at logout', async () => {
    // stub: the write
    const stubPut = sinon.stub(DbOpsUtils, 'put').returns({ status: 200, value: { id: userInfo.username } });

    // call
    const r = await UsersLocalAuthService.logout(config, { ..._ctx, username: userInfo.username });

    // check: a new key was saved
    chai.expect(r.status).to.equal(200);
    chai.expect(stubPut.firstCall.args[2].sessionKey).to.be.a('string').and.not.equal('session1');
  });
});
