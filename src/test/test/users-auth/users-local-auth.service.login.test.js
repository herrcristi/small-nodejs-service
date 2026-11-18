const sinon = require('sinon');
const chai = require('chai');

const CommonUtils = require('../../../core/utils/common.utils.js');
const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthDatabase = require('../../../services/users-auth/users-local-auth.database.js');
const UsersLocalAuthService = require('../../../services/users-auth/users-local-auth.service.js');

/**
 * the login of the local provider: its time and answer do not tell if an account exists
 */
describe('Users Local Auth Service login', function () {
  const _ctx = { reqID: 'testReq', lang: 'en' };
  const config = { serviceName: UsersAuthConstants.ServiceName };
  const objInfo = { username: 'user@testdomain.test', password: 'Password1!' };

  beforeEach(function () {
    sinon.stub(UsersAuthDatabase, 'collection').resolves(null);
  });

  afterEach(function () {
    sinon.restore();
  });

  /**
   * an unknown account takes the time of a wrong password (the hash is computed anyway)
   */
  it('should hash the password also for an account that does not exist', async () => {
    // stub: no account; count the hashes
    sinon.stub(DbOpsUtils, 'getOne').returns({ status: 404, error: { message: 'Not found' } });
    const spyHash = sinon.spy(CommonUtils, 'getHash');

    // call
    const res = await UsersLocalAuthService.login(config, objInfo, _ctx);

    // check: not found, after the same hashes as a wrong password
    chai.expect(res.status).to.equal(404);
    chai.expect(spyHash.callCount).to.equal(2); // the same work as a wrong password: the password and the site salt
  });

  /**
   * a wrong password is refused, whatever the length of the stored hash
   */
  it('should refuse a wrong password, also when the stored hash has another length', async () => {
    // stub: the stored account changes in the loop
    const getOne = sinon.stub(DbOpsUtils, 'getOne');

    // a stored hash of the same length and a shorter one: both 401
    for (const password of ['0'.repeat(128), 'short']) {
      getOne.returns({ status: 200, value: { id: objInfo.username, salt: 'salt1', password } });
      const res = await UsersLocalAuthService.login(config, objInfo, _ctx);
      chai.expect(res.status).to.equal(401);
      chai.expect(res.error.message).to.equal('Invalid username/password');
    }
  });

  /**
   * the right password logs in; the account is not changed (the session has its own record)
   */
  it('should accept the right password', async () => {
    // the stored hash of the right password, as post computes it; no write is expected
    const salt = 'salt1';
    const stored = CommonUtils.getHash(CommonUtils.getHash(objInfo.password, salt), process.env.SMALL_API_SALT);
    sinon.stub(DbOpsUtils, 'getOne').returns({ status: 200, value: { id: objInfo.username, salt, password: stored } });
    const stubPut = sinon.stub(DbOpsUtils, 'put');

    // call
    const res = await UsersLocalAuthService.login(config, objInfo, _ctx);

    // check: logged in, without the password and the salt, nothing written
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.id).to.equal(objInfo.username);
    chai.expect(res.value).to.not.have.any.keys('password', 'salt');
    chai.expect(stubPut.callCount).to.equal(0);
  });
});
