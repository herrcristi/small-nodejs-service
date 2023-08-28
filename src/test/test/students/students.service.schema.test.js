const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const StudentsConstants = require('../../../services/students/students.constants.js');
const StudentsService = require('../../../services/students/students.service.js');

describe('Students Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Students' };
  let postReq = {};

  before(async function () {});

  beforeEach(async function () {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    // valid post req
    postReq = {
      ...testStudent,
    };
    delete postReq.type;
    delete postReq.name;
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
    let res = StudentsService.Validators.Post.validate(postReq);
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
    let res = StudentsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"id" is required');

    // id is number
    postReq.id = 1;
    res = StudentsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"id" must be a string');

    // id is null
    postReq.id = null;
    res = StudentsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"id" must be a string');

    // id empty
    postReq.id = '';
    res = StudentsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"id" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post classes
   */
  it('should validate post schema for classes', async () => {
    // classes must be a string
    postReq.classes = 1;
    let res = StudentsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"classes" must be an array');

    // classes null
    postReq.classes = null;
    res = StudentsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"classes" must be an array');

    // classes empty allowed
    postReq.classes = [];
    res = StudentsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // classes invalid value
    postReq.classes = ['some value'];
    res = StudentsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"classes[0]" must be of type object');

    // classes id is required
    postReq.classes = [{}];
    res = StudentsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"classes[0].id" is required');

    // classes id must be a string
    postReq.classes = [{ id: 1 }];
    res = StudentsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"classes[0].id" must be a string');

    // classes id empty
    postReq.classes = [{ id: '' }];
    res = StudentsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"classes[0].id" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post extra
   */
  it('should validate post schema for extra', async () => {
    // extra is not allowed
    postReq.extra = 1;
    let res = StudentsService.Validators.Post.validate(postReq);
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
    let res = StudentsService.Validators.Put.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    putReq = {
      extra: 1,
    };
    res = StudentsService.Validators.Put.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);

  /**
   * schema patch
   * is the same as post - add only the extra cases
   */
  it('should validate patch schema set', async () => {
    // nothing is required
    let patchReq = {};
    let res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    patchReq = {
      extra: 1,
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');

    // set must be an object
    patchReq = {
      set: 1,
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set" must be of type object');

    // set empty is allowed
    patchReq = {
      set: {},
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
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
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"unset" is not allowed');
  }).timeout(10000);

  /**
   * schema patch.add
   */
  it('should validate patch schema add', async () => {
    // add must be an object
    let patchReq = {
      add: 1,
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add" must be of type object');

    // add empty is allowed
    patchReq = {
      add: {},
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // add extra
    patchReq = {
      add: {
        extra: 1,
      },
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.extra" is not allowed');

    // add classes
    patchReq = {
      add: {
        classes: 1,
      },
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.classes" must be an array');

    // add classes empty
    patchReq = {
      add: {
        classes: [{}],
      },
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('add.classes[0].id" is required');

    // add classes roles req
    patchReq = {
      add: {
        classes: [
          {
            id: 'id1',
          },
        ],
      },
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema patch.remove
   */
  it('should validate patch schema remove', async () => {
    // remove must be an object
    let patchReq = {
      remove: 1,
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove" must be of type object');

    // remove empty is allowed
    patchReq = {
      remove: {},
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // remove extra
    patchReq = {
      remove: {
        extra: 1,
      },
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove.extra" is not allowed');

    // remove classes
    patchReq = {
      remove: {
        classes: 1,
      },
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove.classes" must be an array');

    // remove classes empty
    patchReq = {
      remove: {
        classes: [],
      },
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // remove classes empty id
    patchReq = {
      remove: {
        classes: [''],
      },
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove.classes[0]" must be of type object');

    // remove classes empty
    patchReq = {
      remove: {
        classes: [{}],
      },
    };
    res = StudentsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('remove.classes[0].id" is required');
  }).timeout(10000);
});
