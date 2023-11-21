const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils.js');

const TestConstants = require('../../test-constants.js');
const ClassesConstants = require('../../../services/classes/classes.constants.js');
const ClassesService = require('../../../services/classes/classes.service.js');

describe('Classes Service', function () {
  const _ctx = { tenantID: 'school-univ1', reqID: 'testReq', lang: 'en', service: 'Service' };
  let postReq = {};

  before(async function () {});

  beforeEach(async function () {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // valid
    postReq = {
      ...testClass,
    };
    delete postReq.id;
    delete postReq.type;
    delete postReq.status;
    delete postReq.description;
    delete postReq.credits;
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
    let res = ClassesService.Validators.Post.validate(postReq);
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
    let res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" is required');

    // name is number
    postReq.name = 1;
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" must be a string');

    // name is null
    postReq.name = null;
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" must be a string');

    // name empty
    postReq.name = '';
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" is not allowed to be empty');

    // name too long
    postReq.name = '0123456789012345678901234567890123456789012345678901234567890123456789';
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"name" length must be less than or equal to 64 characters long');

    // name only is enough
    postReq.name = 'name';
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post description
   */
  it('should validate post schema for description', async () => {
    // description must be a string
    postReq.description = 1;
    let res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"description" must be a string');

    // description too long
    postReq.description = '';
    for (let i = 0; i < 200; ++i) {
      postReq.description += '0123456789';
    }
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"description" length must be less than or equal to 1024 characters long');

    // description is null
    postReq.description = null;
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post status
   */
  it('should validate post schema for status', async () => {
    // status must be a string
    postReq.status = 1;
    let res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status null
    postReq.status = null;
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status empty
    postReq.status = '';
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status too long
    postReq.status = '0123456789012345678901234567890123456789012345678901234567890123456789';
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status invalid value
    postReq.status = 'some value';
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status value
    postReq.status = ClassesConstants.Status.Active;
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post credits
   */
  it('should validate post schema for credits', async () => {
    // credits must be a number
    postReq.credits = '1';
    let res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"credits" must be a number');

    // credits null
    postReq.credits = null;
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"credits" must be a number');

    // credits negative
    postReq.credits = -1;
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"credits" must be greater than or equal to 0');

    // credits too big
    postReq.credits = 100000000000;
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"credits" must be less than or equal to 1024');

    // credits value
    postReq.credits = 1;
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post required
   */
  it('should validate post schema for required', async () => {
    // required must be a string
    postReq.required = 1;
    let res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"required" must be one of [required, optional]');

    // required null
    postReq.required = null;
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"required" must be one of [required, optional]');

    // required empty
    postReq.required = '';
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"required" must be one of [required, optional]');

    // required too long
    postReq.required = '0123456789012345678901234567890123456789012345678901234567890123456789';
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"required" must be one of [required, optional]');

    // required invalid value
    postReq.required = 'some value';
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"required" must be one of [required, optional]');

    // required value
    postReq.required = ClassesConstants.Required.Required;
    res = ClassesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post extra
   */
  it('should validate post schema for extra', async () => {
    // extra is not allowed
    postReq.extra = 1;
    let res = ClassesService.Validators.Post.validate(postReq);
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
    let res = ClassesService.Validators.Put.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    putReq = {
      extra: 1,
    };
    res = ClassesService.Validators.Put.validate(putReq);
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
    let res = ClassesService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    patchReq = {
      extra: 1,
    };
    res = ClassesService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');

    // set must be an object
    patchReq = {
      set: 1,
    };
    res = ClassesService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set" must be of type object');

    // set empty is allowed
    patchReq = {
      set: {},
    };
    res = ClassesService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // unset must be an object
    patchReq = {
      unset: 1,
    };
    res = ClassesService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"unset" must be an array');

    // unset empty is allowed
    patchReq = {
      unset: [],
    };
    res = ClassesService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // unset invalid
    patchReq = {
      unset: ['extra'],
    };
    res = ClassesService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"unset[0]" must be [description]');
  }).timeout(10000);
});
