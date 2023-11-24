const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const SchedulesConstants = require('../../../services/schedules/schedules.constants.js');
const SchedulesService = require('../../../services/schedules/schedules.service.js');
const SchedulesRest = require('../../../services/rest/schedules.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Schedules Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Schedules' };

  const testSchedules = _.cloneDeep(TestConstants.Schedules);
  const testSchedule = testSchedules[0];

  const testPostReq = {
    ...testSchedule,
    class: testSchedule.class.id,
    schedules: [{ ...testSchedule.schedules[0], location: testSchedule.schedules[0].location.id }],
    professors: [{ id: testSchedule.professors[0].id }],
    groups: [{ id: testSchedule.groups[0].id }],
    students: [{ id: testSchedule.students[0].id }],
  };
  delete testPostReq.id;
  delete testPostReq.type;
  delete testPostReq._lang_en;

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * post with success
   */
  it('should post with success', async () => {
    const postReq = _.cloneDeep(testPostReq);

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`DbOpsUtils.post called`);
      return {
        status: 201,
        value: { ...postObj, id: testSchedule.id, class: testSchedule.class },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    let stubSchedulesRest = sinon.stub(SchedulesRest, 'raiseNotification').callsFake(() => {
      console.log(`SchedulesRest raiseNotification called`);
    });

    // call
    let res = await SchedulesService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubSchedulesRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        id: testSchedule.id,
        name: testSchedule.name,
        type: testSchedule.type,
        status: testSchedule.status,
        class: testSchedule.class,
      },
    });
  }).timeout(10000);

  /**
   * post with success with defaults
   */
  it('should post with success with defaults', async () => {
    const postReq = _.cloneDeep(testPostReq);
    delete postReq.status;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`DbOpsUtils.post called`);
      return {
        status: 201,
        value: { ...postObj, id: testSchedule.id, class: testSchedule.class },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    let stubSchedulesRest = sinon.stub(SchedulesRest, 'raiseNotification').callsFake(() => {
      console.log(`SchedulesRest raiseNotification called`);
    });

    // call
    let res = await SchedulesService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubSchedulesRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        id: testSchedule.id,
        name: testSchedule.name,
        type: testSchedule.type,
        status: SchedulesConstants.Status.Pending,
        class: testSchedule.class,
      },
    });
  }).timeout(10000);

  /**
   * post failed no tenant
   */
  it('should post failed tenant', async () => {
    // call
    let res = await SchedulesService.post({}, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * post fail validation
   */
  it('should post fail validation', async () => {
    const postReq = _.cloneDeep(testPostReq);
    postReq.id = testSchedule.id;

    // call
    let res = await SchedulesService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "id" is not allowed');
  }).timeout(10000);

  /**
   * post fail references
   */
  it('should post fail references', async () => {
    const postReq = _.cloneDeep(testPostReq);

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchedulesService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * post fail post
   */
  it('should post fail post', async () => {
    const postReq = _.cloneDeep(testPostReq);

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`DbOpsUtils.post called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchedulesService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);
});
