const chai = require('chai');

const UsersAuthServiceFirebase = require('../../../services/users-auth/users-firebase-auth.service.js');

describe('Users Firebase Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users Auth' };
  const config = { serviceName: 'users-auth' };

  /**
   * the firebase provider is not implemented: every operation answers 500 Not implemented
   */
  it('should answer not implemented for every operation', async () => {
    // call: each operation
    await UsersAuthServiceFirebase.init();
    const results = [
      await UsersAuthServiceFirebase.login(config, { username: 'ana.pop@testdomain.test', password: 'x' }, _ctx),
      await UsersAuthServiceFirebase.logout(config, _ctx),
      await UsersAuthServiceFirebase.validateToken(config, { token: 'token' }, _ctx),
      await UsersAuthServiceFirebase.post(config, { username: 'ana.pop@testdomain.test' }, _ctx),
      await UsersAuthServiceFirebase.delete(config, 'ana.pop@testdomain.test', _ctx),
      await UsersAuthServiceFirebase.putPassword(config, 'ana.pop@testdomain.test', {}, _ctx),
      await UsersAuthServiceFirebase.putID(config, 'ana.pop@testdomain.test', {}, _ctx),
      await UsersAuthServiceFirebase.resetPassword(config, 'ana.pop@testdomain.test', 'signup', _ctx),
      await UsersAuthServiceFirebase.sendEmail(config, 'ana.pop@testdomain.test', {}, _ctx),
    ];

    // check: all 500 Not implemented
    for (const r of results) {
      chai.expect(r.status).to.equal(500);
      chai.expect(r.error.message).to.equal('Not implemented');
    }
  }).timeout(10000);

  /**
   * the token of a login is given back with its user
   */
  it('should get the token of a login', async () => {
    // call
    const userInfo = { token: 'token1', username: 'ana.pop@testdomain.test' };
    const r = await UsersAuthServiceFirebase.getToken(config, userInfo, _ctx);

    // check
    chai.expect(r).to.deep.equal({ status: 200, value: { token: 'token1', data: { username: userInfo.username } } });
  }).timeout(10000);
});
