const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthSignupService = require('../../../services/users-auth/users-auth.signup.service.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };
  let postReq = {};

  before(async function () {});

  beforeEach(async function () {
    const testUsers = _.cloneDeep(TestConstants.UsersInvite);
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
    const result = UsersAuthSignupService.Validators.Signup.validate(TestConstants.UsersSignup[0]);
    chai.expect(result.error).to.not.exist;
  }).timeout(10000);

  /**
   * signup needs the email of the admin and the name of the school
   */
  it('should validate required signup fields', async () => {
    // no email
    const missingEmail = UsersAuthSignupService.Validators.Signup.validate({ school: { name: 'School' } });
    chai.expect(missingEmail.error.details[0].message).to.include('"email" is required');

    // no school name
    const missingName = UsersAuthSignupService.Validators.Signup.validate({ email: 'admin@example.test', school: {} });
    chai.expect(missingName.error.details[0].message).to.include('"school.name" is required');
  }).timeout(10000);

  /**
   * signup refuses the unknown fields
   */
  it('should reject extra signup fields', async () => {
    // a valid signup with an extra field
    const result = UsersAuthSignupService.Validators.Signup.validate({
      ...TestConstants.UsersSignup[0],
      extra: true,
    });

    // check
    chai.expect(result.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);

  /**
   * schema for invite
   */
  it('should validate invite schema with success', async () => {
    // call
    let res = UsersAuthSignupService.Validators.Invite.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.error).to.not.exists;
  }).timeout(10000);

  /**
   * schema invite email
   */
  it('should validate invite schema for email', async () => {
    // email is required
    delete postReq.email;
    let res = UsersAuthSignupService.Validators.Invite.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" is required');

    // email is number
    postReq.email = 1;
    res = UsersAuthSignupService.Validators.Invite.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a string');

    // email is null
    postReq.email = null;
    res = UsersAuthSignupService.Validators.Invite.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a string');

    // email empty
    postReq.email = '';
    res = UsersAuthSignupService.Validators.Invite.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" is not allowed to be empty');

    // email not valid
    postReq.email = 'email';
    res = UsersAuthSignupService.Validators.Invite.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a valid email');
  }).timeout(10000);

  /**
   * schema invite extra
   */
  it('should validate invite schema for extra', async () => {
    // extra is not allowed
    postReq.extra = 1;
    let res = UsersAuthSignupService.Validators.Invite.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);
});
