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
   * a reset token as resetPassword makes it: the purpose, the user, and the secret of its link
   */
  const getResetToken = (testUser, purpose = 'reset-password', secret = 'secret1') => {
    const data = { purpose, username: testUser.id, userID: testUser.userID, secret };
    const rT = JwtUtils.getJwt(data, `${UsersAuthConstants.ServiceName}-local`, _ctx, 3600);
    return JwtUtils.encrypt(rT.value, UsersAuthConstants.ServiceName, _ctx).value; // double encryption
  };

  /**
   * the record of a link as the sessions service keeps it: the hash of the secret, the purpose, the user, the expiry
   */
  const getLink = (testUser, purpose = 'reset-password', secret = 'secret1') => {
    const id = crypto.createHash('sha256').update(secret).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    return { id, purpose, userID: testUser.userID, username: testUser.id, expiresAt };
  };

  /**
   * validateResetToken with success
   */
  it('should validateResetToken with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub: a reset token (as resetPassword makes it), and the record of its link
    let token = getResetToken(testUser);
    const stubGet = sinon.stub(DbOpsUtils, 'getOne').returns({ status: 200, value: getLink(testUser) });

    // call
    let res = await UsersAuthService.validateResetToken({ token }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the user and the purpose; the record was read by the hash of the secret (never the secret)
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        userID: testUser.userID,
        username: testUser.id,
        type: testUser.type,
      },
    });
    chai.expect(stubGet.firstCall.args[1]).to.equal(getLink(testUser).id);
  }).timeout(10000);

  /**
   * a reset token is only for a reset, and only while its link is valid: used, replaced by a newer link, ended by a
   * password change, expired, or of another purpose or user, it is refused
   */
  it('should validateResetToken refuse a session token and a link that is not valid anymore', async () => {
    // stub: the record of the link changes in the steps
    const testUser = _.cloneDeep(TestConstants.UsersAuth)[0];
    const getOne = sinon.stub(DbOpsUtils, 'getOne');
    const refused = async (token, message = 'The link is not valid anymore') => {
      const res = await UsersAuthService.validateResetToken({ token }, _ctx);
      chai.expect(res.status).to.equal(401);
      chai.expect(res.error.message).to.equal(message);
    };

    // a session token (the cookie) is not a reset token
    const rSession = await UsersLocalAuthService.getToken({}, { ...testUser, username: testUser.id }, _ctx);
    const sessionToken = JwtUtils.encrypt(rSession.value, UsersAuthConstants.ServiceName, _ctx).value;
    await refused(sessionToken, 'Not a reset token');

    // no record: used, replaced by a newer link, or ended by a password change
    getOne.returns({ status: 404, error: { message: 'Not found' } });
    await refused(getResetToken(testUser));

    // an expired record, a record of another purpose or of another user
    const expired = new Date(Date.now() - 1000);
    for (const record of [
      { ...getLink(testUser), expiresAt: expired },
      { ...getLink(testUser), expiresAt: 'not a date' },
      getLink(testUser, 'signup'),
      { ...getLink(testUser), username: 'other.user@testdomain.test' },
    ]) {
      getOne.returns({ status: 200, value: record });
      await refused(getResetToken(testUser));
    }

    // a token without a secret (made before the links had records)
    await refused(getResetToken(testUser, 'reset-password', ''));

    // the database fails: the real error
    getOne.returns({ status: 500, error: { message: 'Test error message' } });
    const res = await UsersAuthService.validateResetToken({ token: getResetToken(testUser) }, _ctx);
    chai.expect(res.status).to.equal(500);

    // the link of an invitation (signup) with its record: it sets up the account, it does not reset a password
    getOne.returns({ status: 200, value: getLink(testUser, 'signup') });
    await refused(getResetToken(testUser, 'signup'), 'The link is not valid');
  }).timeout(10000);

  /**
   * the link of an invitation is validated by the page that sets up the account (validateSetupToken), and only it: a
   * reset link is refused there
   */
  it('should validateSetupToken only the link of an invitation', async () => {
    const testUser = _.cloneDeep(TestConstants.UsersAuth)[0];
    const getOne = sinon.stub(DbOpsUtils, 'getOne');

    // call: the link of an invitation
    getOne.returns({ status: 200, value: getLink(testUser, 'signup') });
    const res = await UsersAuthService.validateSetupToken({ token: getResetToken(testUser, 'signup') }, _ctx);

    // check: the user of the link
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { userID: testUser.userID, username: testUser.id, type: testUser.type },
    });

    // case: a reset link
    getOne.returns({ status: 200, value: getLink(testUser) });
    const resReset = await UsersAuthService.validateSetupToken({ token: getResetToken(testUser) }, _ctx);
    chai.expect(resReset.status).to.equal(401);
    chai.expect(resReset.error.message).to.equal('The link is not valid');
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
