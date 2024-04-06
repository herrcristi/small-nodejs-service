const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthSignupService = require('../../../services/users-auth/users-auth.signup.service.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };
  let postReq = {};

  before(async function () {});

  beforeEach(async function () {
    const testUsers = _.cloneDeep(TestConstants.UsersSignup);
    const testUser = testUsers[0];

    // valid post req
    postReq = {
      ...testUser,
    };
  });

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * schema for signup
   */
  it('should validate signup schema with success', async () => {
    // call
    let res = UsersAuthSignupService.Validators.Signup.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.error).to.not.exists;
  }).timeout(10000);

  /**
   * schema post email
   */
  it('should validate post schema for email', async () => {
    // email is required
    delete postReq.email;
    let res = UsersAuthSignupService.Validators.Signup.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" is required');

    // email is number
    postReq.email = 1;
    res = UsersAuthSignupService.Validators.Signup.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a string');

    // email is null
    postReq.email = null;
    res = UsersAuthSignupService.Validators.Signup.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a string');

    // email empty
    postReq.email = '';
    res = UsersAuthSignupService.Validators.Signup.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" is not allowed to be empty');

    // email not valid
    postReq.email = 'email';
    res = UsersAuthSignupService.Validators.Signup.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a valid email');
  }).timeout(10000);

  /**
   * schema post password
   */
  it('should validate post schema for password', async () => {
    // password is required
    delete postReq.password;
    let res = UsersAuthSignupService.Validators.Signup.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"password" is required');

    // password is number
    postReq.password = 1;
    res = UsersAuthSignupService.Validators.Signup.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"password" must be a string');

    // password is null
    postReq.password = null;
    res = UsersAuthSignupService.Validators.Signup.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"password" must be a string');

    // password empty
    postReq.password = '';
    res = UsersAuthSignupService.Validators.Signup.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"password" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post extra
   */
  it('should validate post schema for extra', async () => {
    // extra is not allowed
    postReq.extra = 1;
    let res = UsersAuthSignupService.Validators.Signup.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);
});
