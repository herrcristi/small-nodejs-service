const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils.js');

const TestConstants = require('../../test-constants.js');
const SchedulesConstants = require('../../../services/schedules/schedules.constants.js');
const SchedulesService = require('../../../services/schedules/schedules.service.js');

describe('Schedules Service', function () {
  const _ctx = { tenantID: 'school-univ1', reqID: 'testReq', lang: 'en', service: 'Service' };
  let postReq = {};

  before(async function () {});

  beforeEach(async function () {
    // valid
    const testSchedules = _.cloneDeep(TestConstants.Schedules);
    const testSchedule = testSchedules[0];

    postReq = {
      ...testSchedule,
      class: testSchedule.class.id,
      schedules: [{ ...testSchedule.schedules[0], location: testSchedule.schedules[0].location.id }],
      professors: [{ id: testSchedule.professors[0].id }],
      groups: [{ id: testSchedule.groups[0].id }],
      students: [{ id: testSchedule.students[0].id }],
    };
    delete postReq.id;
    delete postReq.type;
    delete postReq._lang_en;
    delete postReq.schedules[0].id;
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
    let res = SchedulesService.Validators.Post.validate(postReq);
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
    let res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" is required');

    // name is number
    postReq.name = 1;
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" must be a string');

    // name is null
    postReq.name = null;
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" must be a string');

    // name empty
    postReq.name = '';
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"name" is not allowed to be empty');

    // name too long
    postReq.name = '0123456789012345678901234567890123456789012345678901234567890123456789';
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"name" length must be less than or equal to 64 characters long');

    // name is enough
    postReq.name = 'name';
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post class
   */
  it('should validate post schema for class', async () => {
    // class must be a string
    postReq.class = 1;
    let res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"class" must be a string');

    // class too long
    postReq.class = '';
    for (let i = 0; i < 20; ++i) {
      postReq.class += '0123456789';
    }
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"class" length must be less than or equal to 64 characters long');

    // class is empty
    postReq.class = '';
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"class" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post status
   */
  it('should validate post schema for status', async () => {
    // status must be a string
    postReq.status = 1;
    let res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status null
    postReq.status = null;
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status empty
    postReq.status = '';
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status too long
    postReq.status = '0123456789012345678901234567890123456789012345678901234567890123456789';
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status invalid value
    postReq.status = 'some value';
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status value
    postReq.status = SchedulesConstants.Status.Active;
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post schedules
   */
  it('should validate post schema for schedules', async () => {
    let currentSchedule = postReq.schedules[0];

    // schedules must be an array
    postReq.schedules = 1;
    let res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schedules" must be an array');

    // schedules null
    postReq.schedules = null;
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schedules" must be an array');

    // schedules not object
    postReq.schedules = [''];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schedules[0]" must be of type object');

    // schedules timestamp empty
    postReq.schedules = [{ ...currentSchedule, timestamp: '' }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schedules[0].timestamp" must be in ISO 8601 date format');

    // schedules frequency not valid
    postReq.schedules = [{ ...currentSchedule, frequency: 1 }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"schedules[0].frequency" must be one of [once, weekly, biWeekly, monthly]');

    // schedules location not string
    postReq.schedules = [{ ...currentSchedule, location: 1 }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schedules[0].location" must be a string');

    // schedules location emtpy
    postReq.schedules = [{ ...currentSchedule, location: '' }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schedules[0].location" is not allowed to be empty');

    // schedules status not valid
    postReq.schedules = [{ ...currentSchedule, status: '' }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"schedules[0].status" must be one of [pending, active, disabled]');

    // schedules extra value
    postReq.schedules = [{ ...currentSchedule, extra: 1 }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schedules[0].extra" is not allowed');

    // schedules value
    postReq.schedules = [{ ...currentSchedule }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post professors
   */
  it('should validate post schema for professors', async () => {
    // professors must be an array
    postReq.professors = 1;
    let res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"professors" must be an array');

    // professors null
    postReq.professors = null;
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"professors" must be an array');

    // professors not object
    postReq.professors = [''];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"professors[0]" must be of type object');

    // professors id empty
    postReq.professors = [{ id: '' }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"professors[0].id" is not allowed to be empty');

    // professors too long
    postReq.professors = [{ id: '0123456789012345678901234567890123456789012345678901234567890123456789' }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"professors[0].id" length must be less than or equal to 64 characters long');

    // professors invalid value
    postReq.professors = [{ id: 1 }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"professors[0].id" must be a string');

    // professors extra value
    postReq.professors = [{ id: 'id', extra: 1 }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"professors[0].extra" is not allowed');

    // professors value
    postReq.professors = [{ id: 'id' }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post groups
   */
  it('should validate post schema for groups', async () => {
    // groups must be an array
    postReq.groups = 1;
    let res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"groups" must be an array');

    // groups null
    postReq.groups = null;
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"groups" must be an array');

    // groups not object
    postReq.groups = [''];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"groups[0]" must be of type object');

    // groups id empty
    postReq.groups = [{ id: '' }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"groups[0].id" is not allowed to be empty');

    // groups too long
    postReq.groups = [{ id: '0123456789012345678901234567890123456789012345678901234567890123456789' }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"groups[0].id" length must be less than or equal to 64 characters long');

    // groups invalid value
    postReq.groups = [{ id: 1 }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"groups[0].id" must be a string');

    // groups extra value
    postReq.groups = [{ id: 'id', extra: 1 }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"groups[0].extra" is not allowed');

    // groups value
    postReq.groups = [{ id: 'id' }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post students
   */
  it('should validate post schema for students', async () => {
    // students must be an array
    postReq.students = 1;
    let res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"students" must be an array');

    // students null
    postReq.students = null;
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"students" must be an array');

    // students not object
    postReq.students = [''];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"students[0]" must be of type object');

    // students id empty
    postReq.students = [{ id: '' }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"students[0].id" is not allowed to be empty');

    // students too long
    postReq.students = [{ id: '0123456789012345678901234567890123456789012345678901234567890123456789' }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"students[0].id" length must be less than or equal to 64 characters long');

    // students invalid value
    postReq.students = [{ id: 1 }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"students[0].id" must be a string');

    // students extra value
    postReq.students = [{ id: 'id', extra: 1 }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"students[0].extra" is not allowed');

    // students value
    postReq.students = [{ id: 'id' }];
    res = SchedulesService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post extra
   */
  it('should validate post schema for extra', async () => {
    // extra is not allowed
    postReq.extra = 1;
    let res = SchedulesService.Validators.Post.validate(postReq);
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
    let res = SchedulesService.Validators.Put.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    putReq = {
      extra: 1,
    };
    res = SchedulesService.Validators.Put.validate(putReq);
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
    let res = SchedulesService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    patchReq = {
      extra: 1,
    };
    res = SchedulesService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');

    // set must be an object
    patchReq = {
      set: 1,
    };
    res = SchedulesService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set" must be of type object');

    // set empty is allowed
    patchReq = {
      set: {},
    };
    res = SchedulesService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);
});
