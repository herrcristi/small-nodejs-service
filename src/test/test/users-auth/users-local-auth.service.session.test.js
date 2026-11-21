const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const JwtUtils = require('../../../core/utils/jwt.utils.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthDatabase = require('../../../services/users-auth/users-local-auth.database.js');
const UsersLocalAuthService = require('../../../services/users-auth/users-local-auth.service.js');

/**
 * the session token of the local provider: it carries the secret of its session record, and only a session token
 * opens a session (the record is checked by the sessions service)
 */
describe('Users Local Auth Service session', function () {
  const _ctx = { reqID: 'testReq', lang: 'en' };
  const config = { serviceName: UsersAuthConstants.ServiceName };
  const issuer = `${UsersAuthConstants.ServiceName}-local`;
  const userInfo = { username: 'user@testdomain.test', userID: 'user1', secret: 'secret1' };

  before(async function () {});

  beforeEach(function () {
    sinon.stub(UsersAuthDatabase, 'collection').resolves(null);
  });

  afterEach(function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * a session token carries its purpose and the secret of its session, and expires with the session
   */
  it('should make a session token that validates as a session', async () => {
    // a session token
    const rT = await UsersLocalAuthService.getToken(config, userInfo, _ctx);

    // call
    const r = await UsersLocalAuthService.validateToken(config, { token: rT.value }, _ctx);

    // check: a session, with its secret
    chai.expect(r.status).to.equal(200);
    chai.expect(r.value).to.include({ purpose: 'session', username: userInfo.username, secret: 'secret1' });

    // valid for the session time
    const payload = JSON.parse(Buffer.from(rT.value.split('.')[1], 'base64url').toString());
    chai.expect(payload.exp - payload.iat).to.equal(UsersAuthConstants.TokenExpiresIn.session);
  });

  /**
   * only a session token opens a session
   */
  it('should not accept a reset token or an invalid token as a session', async () => {
    // a reset token: refused
    const resetToken = JwtUtils.getJwt({ purpose: 'reset-password', username: userInfo.username }, issuer, _ctx, 3600);
    let r = await UsersLocalAuthService.validateToken(config, { token: resetToken.value }, _ctx);
    chai.expect(r.status).to.equal(401);
    chai.expect(r.error.message).to.equal('Not a session token');

    // not a token: refused
    r = await UsersLocalAuthService.validateToken(config, { token: 'not a token' }, _ctx);
    chai.expect(r.status).to.equal(401);
  });

  /**
   * the provider has nothing to end at logout: the session record is ended by the sessions service
   */
  it('should logout without changing the account', async () => {
    // stub: no write is expected
    const stubPut = sinon.stub(DbOpsUtils, 'put');

    // call
    const r = await UsersLocalAuthService.logout(config, { ..._ctx, username: userInfo.username });

    // check: success, the account is not changed
    chai.expect(r.status).to.equal(200);
    chai.expect(stubPut.callCount).to.equal(0);
  });
});
