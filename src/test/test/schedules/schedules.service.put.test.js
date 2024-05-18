const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');
const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');

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

  const testPutReq = {
    ...testSchedule,
    class: testSchedule.class.id,
    schedules: [{ ...testSchedule.schedules[0], location: testSchedule.schedules[0].location.id }],
    professors: [{ id: testSchedule.professors[0].id }],
    groups: [{ id: testSchedule.groups[0].id }],
    students: [{ id: testSchedule.students[0].id }],
  };
  delete testPutReq.id;
  delete testPutReq.type;
  delete testPutReq._lang_en;

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * put with success
   */
  it('should put with success', async () => {
    const putReq = _.cloneDeep(testPutReq);

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testSchedule },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, putObj) => {
      console.log(`\nDbOpsUtils.put called`);
      return {
        status: 200,
        value: { ...testSchedule },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubSchedulesRest = sinon.stub(SchedulesRest, 'raiseNotification').callsFake(() => {
      console.log(`\nSchedulesRest raiseNotification called`);
    });

    // call
    let res = await SchedulesService.put(testSchedule.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubSchedulesRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
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
   * put with success with removed notif
   */
  it('should put with success with removed notif', async () => {
    const putReq = _.cloneDeep(testPutReq);
    putReq.schedules = []; // no more schedules
    putReq.professors = []; // no more professors
    putReq.groups = []; // no more groups
    putReq.students = []; // no more students

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testSchedule },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, putObj) => {
      console.log(`\nDbOpsUtils.put called`);
      return {
        status: 200,
        value: { ...testSchedule, ...putReq, class: testSchedule.class },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubSchedulesRest = sinon.stub(SchedulesRest, 'raiseNotification');
    stubSchedulesRest.onCall(0).callsFake((notificationType, objs) => {
      console.log(`\nSchedulesRest raiseNotification called`);
      console.log(`\nNotificationType: ${JSON.stringify(notificationType, null, 2)}`);
      console.log(`\nNotifications: ${JSON.stringify(objs, null, 2)}`);

      chai.expect(notificationType).to.equal(NotificationsUtils.Constants.Notification.Modified);
      chai.expect(objs).to.deep.equal([
        {
          id: testSchedule.id,
          name: testSchedule.name,
          type: testSchedule.type,
          status: testSchedule.status,
          class: testSchedule.class,
          schedules: putReq.schedules,
          professors: putReq.professors,
          groups: putReq.groups,
          students: putReq.students,
        },
      ]);
    });
    stubSchedulesRest.onCall(1).callsFake((notificationType, objs) => {
      console.log(`\nSchedulesRest raiseNotification called`);
      console.log(`\nNotificationType: ${JSON.stringify(notificationType, null, 2)}`);
      console.log(`\nNotifications: ${JSON.stringify(objs, null, 2)}`);

      chai.expect(notificationType).to.equal(NotificationsUtils.Constants.Notification.Removed);
      chai.expect(objs).to.deep.equal([
        {
          id: testSchedule.id,
          name: testSchedule.name,
          type: testSchedule.type,
          status: testSchedule.status,
          class: testSchedule.class,
          schedules: [testSchedule.schedules[0]],
          professors: [testSchedule.professors[0]],
          groups: [testSchedule.groups[0]],
          students: [testSchedule.students[0]],
        },
      ]);
    });

    // call
    let res = await SchedulesService.put(testSchedule.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubSchedulesRest.callCount).to.equal(2);
    chai.expect(res).to.deep.equal({
      status: 200,
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
   * put failed no tenant
   */
  it('should put failed tenant', async () => {
    // call
    let res = await SchedulesService.put('id', {}, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * put fail validation
   */
  it('should put fail validation', async () => {
    const putReq = _.cloneDeep(testPutReq);
    putReq.id = testSchedule.id;

    // call
    let res = await SchedulesService.put(testSchedule.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "id" is not allowed');
  }).timeout(10000);

  /**
   * put fail get
   */
  it('should put fail get', async () => {
    const putReq = _.cloneDeep(testPutReq);

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.get called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchedulesService.put(testSchedule.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * put fail references
   */
  it('should put fail references', async () => {
    const putReq = _.cloneDeep(testPutReq);

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testSchedule },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchedulesService.put(testSchedule.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
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
   * put fail put
   */
  it('should put fail put', async () => {
    const putReq = _.cloneDeep(testPutReq);

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testSchedule },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, putObj) => {
      console.log(`\nDbOpsUtils.put called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchedulesService.put(testSchedule.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
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
