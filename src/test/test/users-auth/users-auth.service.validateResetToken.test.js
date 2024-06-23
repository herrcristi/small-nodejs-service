const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

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
   * validateResetToken with success
   */
  it('should validateResetToken with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // get token from resetPassword
    let rT = await UsersLocalAuthService.getToken({}, testUser, _ctx);
    const authIssuer = `${UsersAuthConstants.ServiceName}`;
    let token = JwtUtils.encrypt(rT.value, authIssuer, _ctx).value; // double encryption

    // call
    let res = await UsersAuthService.validateResetToken({ token }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testUser.id,
        name: testUser.id,
        type: testUser.type,
      },
    });
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
    let token = 'toekn';

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
