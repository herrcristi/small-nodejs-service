const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const TestConstants = require('../../test-constants.js');
const UsersConstants = require('../../../services/users/users.constants.js');
const UsersService = require('../../../services/users/users.service.js');

describe('Users Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };
  let postReq = {};

  before(async function () {});

  beforeEach(async function () {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // valid post req
    postReq = {
      email: testUser.email,
      name: testUser.name,
      schools: testUser.schools,
    };
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
    let res = UsersService.Validators.Post.validate(postReq);
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
    let res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" is required');

    // email is number
    postReq.email = 1;
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a string');

    // email is null
    postReq.email = null;
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a string');

    // email empty
    postReq.email = '';
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" is not allowed to be empty');

    // email not valid
    postReq.email = 'email';
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a valid email');
  }).timeout(10000);

  /**
   * schema post name
   */
  it('should validate post schema for name', async () => {
    // name is number
    postReq.name = 1;
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" must be a string');

    // name is null
    postReq.name = null;
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" must be a string');

    // name empty
    postReq.name = '';
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post schools
   */
  it('should validate post schema for schools', async () => {
    // schools must be a string
    postReq.schools = 1;
    let res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools" must be an array');

    // schools null
    postReq.schools = null;
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools" must be an array');

    // schools empty allowed
    postReq.schools = [];
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // schools invalid value
    postReq.schools = ['some value'];
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0]" must be of type object');

    // schools id is required
    postReq.schools = [{}];
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].id" is required');

    // schools id must be a string
    postReq.schools = [{ id: 1 }];
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].id" must be a string');

    // schools empty
    postReq.schools = [{ id: '' }];
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].id" is not allowed to be empty');

    // schools roles is required
    postReq.schools = [{ id: 'id1' }];
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].roles" is required');

    // schools roles must be an array
    postReq.schools = [{ id: 'id1', roles: 1 }];
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].roles" must be an array');

    // schools roles must have 1 el
    postReq.schools = [{ id: 'id1', roles: [] }];
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].roles" does not contain 1 required value(s)');

    // schools roles must be strings
    postReq.schools = [{ id: 'id1', roles: [{}] }];
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"schools[0].roles[0]" must be one of [portal-admin, admin, professor, student]');

    // schools roles must be strings
    postReq.schools = [{ id: 'id1', roles: [''] }];
    res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"schools[0].roles[0]" must be one of [portal-admin, admin, professor, student]');
  }).timeout(10000);

  /**
   * schema post extra
   */
  it('should validate post schema for extra', async () => {
    // extra is not allowed
    postReq.extra = 1;
    let res = UsersService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);

  /**
   * schema put
   * is the same as post - add only the extra cases
   */
  it('should validate put schema', async () => {
    // an empty change is refused (nothing to do)
    let putReq = {};
    let res = UsersService.Validators.Put.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"value" must have at least 1 key');

    // other params
    putReq = {
      extra: 1,
    };
    res = UsersService.Validators.Put.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);

  /**
   * schema putEmail
   */
  it('should validate putEmail schema', async () => {
    // nothing is required
    let putReq = {};
    let res = UsersService.Validators.PutEmail.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" is required');

    // other params
    putReq = {
      email: 'email@test.com',
      extra: 1,
    };
    res = UsersService.Validators.PutEmail.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');

    // other params
    putReq = {
      email: 'email',
    };
    res = UsersService.Validators.PutEmail.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a valid email');
  }).timeout(10000);

  /**
   * schema patch
   * is the same as post - add only the extra cases
   */
  it('should validate patch schema set', async () => {
    // an empty change is refused (nothing to do)
    let patchReq = {};
    let res = UsersService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"value" must have at least 1 key');

    // other params
    patchReq = {
      extra: 1,
    };
    res = UsersService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');

    // set must be an object
    patchReq = {
      set: 1,
    };
    res = UsersService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set" must be of type object');

    // set empty is allowed
    patchReq = {
      set: {},
    };
    res = UsersService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema patch.unset
   */
  it('should validate patch schema unset', async () => {
    // unset must be an object
    let patchReq = {
      unset: 1,
    };
    res = UsersService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"unset" must be an array');

    // unset empty is allowed
    patchReq = {
      unset: [],
    };
    res = UsersService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // unset invalid
    patchReq = {
      unset: ['extra'],
    };
    res = UsersService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"unset[0]" must be [phoneNumber]');
  }).timeout(10000);

  /**
   * schema patch.add
   */
  it('should validate patch schema add', async () => {
    // no add
    let patchReq = {
      add: 1,
    };
    res = UsersService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add" is not allowed');
  }).timeout(10000);

  /**
   * schema patch.remove
   */
  it('should validate patch schema remove', async () => {
    // no remove
    let patchReq = {
      remove: 1,
    };
    res = UsersService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove" is not allowed');
  }).timeout(10000);

  /**
   * schema patchSchool.set
   */
  it('should validate patch schema school.set', async () => {
    // add must be an object
    let patchReq = {
      set: 1,
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set" is not allowed');
  }).timeout(10000);

  /**
   * schema patchSchool.add
   */
  it('should validate patch schema school.add', async () => {
    // add must be an object
    let patchReq = {
      add: 1,
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add" must be of type object');

    // add empty is allowed
    patchReq = {
      add: {},
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // add extra
    patchReq = {
      add: {
        extra: 1,
      },
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.extra" is not allowed');

    // add schools
    patchReq = {
      add: {
        schools: 1,
      },
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.schools" must be an array');

    // add schools empty
    patchReq = {
      add: {
        schools: [{}],
      },
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('add.schools[0].id" is required');

    // add schools roles req
    patchReq = {
      add: {
        schools: [
          {
            id: 'id1',
          },
        ],
      },
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.schools[0].roles" is required');

    // add schools roles
    patchReq = {
      add: {
        schools: [
          {
            id: 'id1',
            roles: [],
          },
        ],
      },
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.schools[0].roles" does not contain 1 required value(s)');
  }).timeout(10000);

  /**
   * schema patchSchool.remove
   */
  it('should validate patch schema School.remove', async () => {
    // remove must be an object
    let patchReq = {
      remove: 1,
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove" must be of type object');

    // remove empty is allowed
    patchReq = {
      remove: {},
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // remove extra
    patchReq = {
      remove: {
        extra: 1,
      },
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove.extra" is not allowed');

    // remove schools
    patchReq = {
      remove: {
        schools: 1,
      },
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove.schools" must be an array');

    // remove schools empty
    patchReq = {
      remove: {
        schools: [{}],
      },
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('remove.schools[0].id" is required');

    // remove schools roles req
    patchReq = {
      remove: {
        schools: [
          {
            id: 'id1',
          },
        ],
      },
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove.schools[0].roles" is required');

    // remove schools roles
    patchReq = {
      remove: {
        schools: [
          {
            id: 'id1',
            roles: [],
          },
        ],
      },
    };
    res = UsersService.Validators.PatchSchool.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"remove.schools[0].roles" does not contain 1 required value(s)');
  }).timeout(10000);

  /**
   * the language of the user (its profile): one of the languages of the application, chosen by the user
   */
  it('should validate the language of the profile', async () => {
    // the languages of the application
    for (const language of ['en', 'ro']) {
      chai.expect(UsersService.Validators.Put.validate({ language }).error, language).to.equal(undefined);
    }

    // case: another language, or not a text
    for (const language of ['fr', 'EN', '', 1, null]) {
      chai.expect(UsersService.Validators.Put.validate({ language }).error, `${language}`).to.not.equal(undefined);
    }
  }).timeout(10000);

  /**
   * the agreements of a user are kept only by users-auth (internal): each one with its version and when it was
   * accepted; the profile (the user itself, the admins of its school) can not change them
   */
  it('should validate the agreements of the user', async () => {
    const agreements = _.cloneDeep(TestConstants.AcceptedAgreements);

    // check: the agreements with their versions and times
    chai.expect(UsersService.Validators.PutAgreements.validate({ agreements }).error).to.equal(undefined);

    // case: none, empty, without a version or a time, a time that is not a date, an unknown field
    for (const wrong of [
      {},
      { agreements: {} },
      { agreements: { terms: { acceptedAt: agreements.terms.acceptedAt } } },
      { agreements: { terms: { version: agreements.terms.version } } },
      { agreements: { terms: { ...agreements.terms, acceptedAt: 'yesterday' } } },
      { agreements: { terms: { ...agreements.terms, by: 'admin' } } },
      { agreements, status: 'active' },
    ]) {
      chai
        .expect(UsersService.Validators.PutAgreements.validate(wrong).error, JSON.stringify(wrong))
        .to.not.equal(undefined);
    }

    // case: the profile does not take them (put and patch)
    chai.expect(UsersService.Validators.Put.validate({ agreements }).error).to.not.equal(undefined);
    chai.expect(UsersService.Validators.Patch.validate({ set: { agreements } }).error).to.not.equal(undefined);
  }).timeout(10000);
});
