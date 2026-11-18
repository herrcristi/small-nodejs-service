const crypto = require('crypto');
const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const JwtUtils = require('../../../core/utils/jwt.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
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
   * a reset token as resetPassword makes it: the purpose, the user, and the fingerprint of the stored password
   */
  const getResetToken = (testUser, purpose = 'reset-password', password = testUser.password) => {
    const fingerprint = crypto.createHash('sha256').update(password).digest('hex').slice(0, 32);
    const data = { purpose, username: testUser.id, userID: testUser.userID, password: fingerprint };
    const rT = JwtUtils.getJwt(data, `${UsersAuthConstants.ServiceName}-local`, _ctx, '1h');
    return JwtUtils.encrypt(rT.value, UsersAuthConstants.ServiceName, _ctx).value; // double encryption
  };

  /**
   * validateResetToken with success
   */
  it('should validateResetToken with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // a reset token (as resetPassword makes it), and the stored account it was made for
    let token = getResetToken(testUser);
    sinon.stub(DbOpsUtils, 'getOne').returns({ status: 200, value: { ...testUser } });

    // call
    let res = await UsersAuthService.validateResetToken({ token }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        userID: testUser.userID,
        username: testUser.id,
        type: testUser.type,
        resetType: 'reset-password',
      },
    });
  }).timeout(10000);

  /**
   * a reset token is only for a reset: a session token is refused, and a reset token is used once
   */
  it('should validateResetToken refuse a session token, a used token and an unknown account', async () => {
    const testUser = _.cloneDeep(TestConstants.UsersAuth)[0];
    const getOne = sinon.stub(DbOpsUtils, 'getOne').returns({ status: 200, value: { ...testUser } });

    // a session token (the cookie) is not a reset token
    const rSession = await UsersLocalAuthService.getToken({}, { ...testUser, username: testUser.id }, _ctx);
    const sessionToken = JwtUtils.encrypt(rSession.value, UsersAuthConstants.ServiceName, _ctx).value;
    let res = await UsersAuthService.validateResetToken({ token: sessionToken }, _ctx);
    chai.expect(res.status).to.equal(401);
    chai.expect(res.error.message).to.equal('Not a reset token');

    // made for another password: the password was set with it (or changed) since
    res = await UsersAuthService.validateResetToken({ token: getResetToken(testUser, 'signup', 'old hash') }, _ctx);
    chai.expect(res.status).to.equal(401);
    chai.expect(res.error.message).to.equal('The link is not valid anymore');

    // the account does not exist anymore
    getOne.returns({ status: 404, error: { message: 'Not found' } });
    res = await UsersAuthService.validateResetToken({ token: getResetToken(testUser) }, _ctx);
    chai.expect(res.status).to.equal(401);

    // an invitation (signup) of the current password
    getOne.returns({ status: 200, value: { ...testUser } });
    res = await UsersAuthService.validateResetToken({ token: getResetToken(testUser, 'signup') }, _ctx);
    chai.expect(res.value.resetType).to.equal('signup');
  }).timeout(10000);

  /**
   * validateResetToken fail validation
   */
  it('should validateResetToken fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const req = {
      token: 'token',
      extra: 1,
    };

    // call
    let res = await UsersAuthService.validateResetToken(req, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "extra" is not allowed');
  }).timeout(10000);

  /**
   * validateResetToken fail first decrypt
   */
  it('should validateResetToken fail first decrypt', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // get token from resetPassword
    let token = 'token';

    // call
    let res = await UsersAuthService.validateResetToken({ token }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Cannot decrypt data',
        error: new Error('Cannot decrypt data'),
      },
    });
  }).timeout(10000);

  /**
   * validateResetToken fail second decrypt
   */
  it('should validateResetToken fail second decrypt', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // get token from resetPassword
    let rT = { value: 'token' };
    const authIssuer = `${UsersAuthConstants.ServiceName}`;
    let token = JwtUtils.encrypt(rT.value, authIssuer, _ctx).value; // double encryption

    // call
    let res = await UsersAuthService.validateResetToken({ token }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Invalid jwt',
        error: new Error('Invalid jwt'),
      },
    });
  }).timeout(10000);
});
