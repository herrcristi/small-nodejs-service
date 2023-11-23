const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils.js');

const TestConstants = require('../../test-constants.js');
const GroupsConstants = require('../../../services/groups/groups.constants.js');
const GroupsService = require('../../../services/groups/groups.service.js');

describe('Groups Service', function () {
  const _ctx = { tenantID: 'school-univ1', reqID: 'testReq', lang: 'en', service: 'Service' };
  let postReq = {};

  before(async function () {});

  beforeEach(async function () {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    // valid
    postReq = {
      ...testGroup,
      students: [{ id: testGroup.students[0].id }],
    };
    delete postReq.id;
    delete postReq.type;
    delete postReq.status;
    delete postReq.description;
    delete postReq._lang_en;
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
    let res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.error).to.not.exists;
  }).timeout(10000);

  /**
   * schema post name
   */
  it('should validate post schema for name', async () => {
    // name is required
    delete postReq.name;
    let res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" is required');

    // name is number
    postReq.name = 1;
    res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" must be a string');

    // name is null
    postReq.name = null;
    res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" must be a string');

    // name empty
    postReq.name = '';
    res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" is not allowed to be empty');

    // name too long
    postReq.name = '0123456789012345678901234567890123456789012345678901234567890123456789';
    res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"name" length must be less than or equal to 64 characters long');

    // name is enough
    postReq.name = 'name';
    res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post description
   */
  it('should validate post schema for description', async () => {
    // description must be a string
    postReq.description = 1;
    let res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"description" must be a string');

    // description too long
    postReq.description = '';
    for (let i = 0; i < 200; ++i) {
      postReq.description += '0123456789';
    }
    res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"description" length must be less than or equal to 1024 characters long');

    // description is null
    postReq.description = null;
    res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post status
   */
  it('should validate post schema for status', async () => {
    // status must be a string
    postReq.status = 1;
    let res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status null
    postReq.status = null;
    res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status empty
    postReq.status = '';
    res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status too long
    postReq.status = '0123456789012345678901234567890123456789012345678901234567890123456789';
    res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status invalid value
    postReq.status = 'some value';
    res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status value
    postReq.status = GroupsConstants.Status.Active;
    res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post extra
   */
  it('should validate post schema for extra', async () => {
    // extra is not allowed
    postReq.extra = 1;
    let res = GroupsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);

  /**
   * schema put
   * is the same as post - add only the extra cases
   */
  it('should validate put schema', async () => {
    // nothing is required
    let putReq = {};
    let res = GroupsService.Validators.Put.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    putReq = {
      extra: 1,
    };
    res = GroupsService.Validators.Put.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);

  /**
   * schema patch
   * is the same as post - add only the extra cases
   */
  it('should validate patch schema', async () => {
    // nothing is required
    let patchReq = {};
    let res = GroupsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    patchReq = {
      extra: 1,
    };
    res = GroupsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');

    // set must be an object
    patchReq = {
      set: 1,
    };
    res = GroupsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set" must be of type object');

    // set empty is allowed
    patchReq = {
      set: {},
    };
    res = GroupsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  // unset must be an object
  patchReq = {
    unset: 1,
  };
  res = GroupsService.Validators.Patch.validate(patchReq);
  console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
  chai.expect(res.error.details[0].message).to.include('"unset" must be an array');

  // unset empty is allowed
  patchReq = {
    unset: [],
  };
  res = GroupsService.Validators.Patch.validate(patchReq);
  console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
  chai.expect(res.error).to.not.exist;

  // unset invalid
  patchReq = {
    unset: ['extra'],
  };
  res = GroupsService.Validators.Patch.validate(patchReq);
  console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
  chai.expect(res.error.details[0].message).to.include('"unset[0]" must be [description]');
});
