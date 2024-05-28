const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };
  let postReq = {};

  before(async function () {});

  beforeEach(async function () {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // valid post req
    postReq = {
      ...testUser,
      password: testUser._test_data.origPassword,
    };
    delete postReq.type;
    delete postReq.salt;
    delete postReq._test_data;
  });

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * schema for post
   */
  it('should validate post schema with success', async () => {
    // call
    let res = UsersAuthService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.error).to.not.exists;
  }).timeout(10000);

  /**
   * schema post id
   */
  it('should validate post schema for id', async () => {
    // id is required
    delete postReq.id;
    let res = UsersAuthService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"id" is required');

    // id is number
    postReq.id = 1;
    res = UsersAuthService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"id" must be a string');

    // id is null
    postReq.id = null;
    res = UsersAuthService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"id" must be a string');

    // id empty
    postReq.id = '';
    res = UsersAuthService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"id" is not allowed to be empty');

    // id not valid
    postReq.id = 'email';
    res = UsersAuthService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"id" must be a valid email');
  }).timeout(10000);

  /**
   * schema post password
   */
  it('should validate post schema for password', async () => {
    // password is required
    delete postReq.password;
    let res = UsersAuthService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"password" is required');

    // password is number
    postReq.password = 1;
    res = UsersAuthService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"password" must be a string');

    // password is null
    postReq.password = null;
    res = UsersAuthService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"password" must be a string');

    // password empty
    postReq.password = '';
    res = UsersAuthService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"password" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post extra
   */
  it('should validate post schema for extra', async () => {
    // extra is not allowed
    postReq.extra = 1;
    let res = UsersAuthService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);

  /**
   * schema putPassword
   */
  it('should validate putPassword schema', async () => {
    // password is required
    let putReq = {};
    let res = UsersAuthService.Validators.PutPassword.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"oldPassword" is required');

    // other params
    putReq = {
      oldPassword: 'pass',
      newPassword: 'pass1',
      extra: 1,
    };
    res = UsersAuthService.Validators.PutPassword.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);

  /**
   * schema putID
   */
  it('should validate putID schema', async () => {
    // password is required
    let putReq = {};
    let res = UsersAuthService.Validators.PutID.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"id" is required');

    // other params
    putReq = {
      id: 'email@test.com',
      password: 'pass1',
      extra: 1,
    };
    res = UsersAuthService.Validators.PutID.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);

  /**
   * schema patchPassword
   */
  it('should validate patchPassword schema set', async () => {
    // nothing is required
    let patchReq = {};
    let res = UsersAuthService.Validators.PatchPassword.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    patchReq = {
      extra: 1,
    };
    res = UsersAuthService.Validators.PatchPassword.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');

    // set must be an object
    patchReq = {
      set: 1,
    };
    res = UsersAuthService.Validators.PatchPassword.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set" must be of type object');

    // set password is required
    patchReq = {
      set: {},
    };
    res = UsersAuthService.Validators.PatchPassword.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set.oldPassword" is required');

    // set extra is not allowed
    patchReq = {
      set: {
        oldPassword: 'pass',
        newPassword: 'pass1',
        extra: 1,
      },
    };
    res = UsersAuthService.Validators.PatchPassword.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set.extra" is not allowed');
  }).timeout(10000);

  /**
   * schema patchID
   */
  it('should validate patchID schema set', async () => {
    // nothing is required
    let patchReq = {};
    let res = UsersAuthService.Validators.PatchID.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    patchReq = {
      extra: 1,
    };
    res = UsersAuthService.Validators.PatchID.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');

    // set must be an object
    patchReq = {
      set: 1,
    };
    res = UsersAuthService.Validators.PatchID.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set" must be of type object');

    // set password is required
    patchReq = {
      set: {},
    };
    res = UsersAuthService.Validators.PatchID.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set.id" is required');

    // set extra is not allowed
    patchReq = {
      set: {
        id: 'email@test.com',
        password: 'pass1',
        extra: 1,
      },
    };
    res = UsersAuthService.Validators.PatchID.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set.extra" is not allowed');
  }).timeout(10000);

  /**
   * schema patchUserSchool
   */
  it('should validate patchUserSchool schema set', async () => {
    // nothing is required
    let patchReq = {};
    let res = UsersAuthService.Validators.PatchUserSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    patchReq = {
      extra: 1,
    };
    res = UsersAuthService.Validators.PatchUserSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');

    // set must be an object
    patchReq = {
      set: 1,
    };
    res = UsersAuthService.Validators.PatchUserSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set" is not allowed');

    // set password is required
    patchReq = {
      add: {},
    };
    res = UsersAuthService.Validators.PatchUserSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.roles" is required');

    // set extra is not allowed
    patchReq = {
      add: {
        extra: 1,
        roles: ['admin'],
      },
    };
    res = UsersAuthService.Validators.PatchUserSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.extra" is not allowed');

    // set role
    patchReq = {
      add: {
        roles: ['admin1'],
      },
    };
    res = UsersAuthService.Validators.PatchUserSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.roles[0]" must be one of [admin, professor, student]');
  }).timeout(10000);
});
