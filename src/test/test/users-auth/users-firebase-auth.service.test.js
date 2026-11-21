const chai = require('chai');

const UsersAuthServiceFirebase = require('../../../services/users-auth/users-firebase-auth.service.js');

describe('Users Firebase Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users Auth' };
  const config = { serviceName: 'users-auth' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {});

  after(async function () {});

  /**
   * the firebase provider is not implemented: every operation answers 500 Not implemented
   */
  it('should answer not implemented for every operation', async () => {
    // call: each operation
    await UsersAuthServiceFirebase.init();
    const results = [
      await UsersAuthServiceFirebase.login(config, { username: 'jane.smith@testdomain.test', password: 'x' }, _ctx),
      await UsersAuthServiceFirebase.logout(config, _ctx),
      await UsersAuthServiceFirebase.validateToken(config, { token: 'token' }, _ctx),
      await UsersAuthServiceFirebase.post(config, { username: 'jane.smith@testdomain.test' }, _ctx),
      await UsersAuthServiceFirebase.delete(config, 'jane.smith@testdomain.test', _ctx),
      await UsersAuthServiceFirebase.putPassword(config, 'jane.smith@testdomain.test', {}, _ctx),
      await UsersAuthServiceFirebase.putID(config, 'jane.smith@testdomain.test', {}, _ctx),
      await UsersAuthServiceFirebase.resetPassword(config, 'jane.smith@testdomain.test', 'signup', _ctx),
      await UsersAuthServiceFirebase.sendEmail(config, 'jane.smith@testdomain.test', {}, _ctx),
      await UsersAuthServiceFirebase.putEmailTimestamp(config, 'jane.smith@testdomain.test', 'invite', _ctx),
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
    const userInfo = { token: 'token1', username: 'jane.smith@testdomain.test' };
    const r = await UsersAuthServiceFirebase.getToken(config, userInfo, _ctx);

    // check
    chai.expect(r).to.deep.equal({ status: 200, value: { token: 'token1', data: { username: userInfo.username } } });
  }).timeout(10000);
});
