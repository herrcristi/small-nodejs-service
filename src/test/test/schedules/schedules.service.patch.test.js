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

  const testPatchReq = {
    set: {
      ...testSchedule,
      class: testSchedule.class.id,
      schedules: [{ ...testSchedule.schedules[0], location: testSchedule.schedules[0].location.id }],
      professors: [{ id: testSchedule.professors[0].id }],
      groups: [{ id: testSchedule.groups[0].id }],
      students: [{ id: testSchedule.students[0].id }],
    },
  };
  delete testPatchReq.set.id;
  delete testPatchReq.set.type;
  delete testPatchReq.set._lang_en;

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const patchReq = _.cloneDeep(testPatchReq);

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`DbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testSchedule },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchObj) => {
      console.log(`DbOpsUtils.patch called`);
      return {
        status: 200,
        value: { ...testSchedule },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    let stubSchedulesRest = sinon.stub(SchedulesRest, 'raiseNotification').callsFake(() => {
      console.log(`SchedulesRest raiseNotification called`);
    });

    // call
    let res = await SchedulesService.patch(testSchedule.id, patchReq, _ctx);
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
   * patch with success with removed notif
   */
  it('should patch with success with removed notif', async () => {
    const patchReq = _.cloneDeep(testPatchReq);
    patchReq.set.schedules = []; // no more schedules
    patchReq.set.professors = []; // no more professors
    patchReq.set.groups = []; // no more groups
    patchReq.set.students = []; // no more students

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`DbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testSchedule },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchObj) => {
      console.log(`DbOpsUtils.patch called`);
      return {
        status: 200,
        value: { ...testSchedule, ...patchReq.set, class: testSchedule.class },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    let stubSchedulesRest = sinon.stub(SchedulesRest, 'raiseNotification');
    stubSchedulesRest.onCall(0).callsFake((notificationType, objs) => {
      console.log(`SchedulesRest raiseNotification called`);
      console.log(`NotificationType: ${JSON.stringify(notificationType, null, 2)}`);
      console.log(`Notifications: ${JSON.stringify(objs, null, 2)}`);

      chai.expect(notificationType).to.equal(NotificationsUtils.Constants.Notification.Modified);
      chai.expect(objs).to.deep.equal([
        {
          id: testSchedule.id,
          name: testSchedule.name,
          type: testSchedule.type,
          status: testSchedule.status,
          class: testSchedule.class,
          schedules: patchReq.set.schedules,
          professors: patchReq.set.professors,
          groups: patchReq.set.groups,
          students: patchReq.set.students,
        },
      ]);
    });
    stubSchedulesRest.onCall(1).callsFake((notificationType, objs) => {
      console.log(`SchedulesRest raiseNotification called`);
      console.log(`NotificationType: ${JSON.stringify(notificationType, null, 2)}`);
      console.log(`Notifications: ${JSON.stringify(objs, null, 2)}`);

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
    let res = await SchedulesService.patch(testSchedule.id, patchReq, _ctx);
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
   * patch failed no tenant
   */
  it('should patch failed tenant', async () => {
    // call
    let res = await SchedulesService.patch('id', {}, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * patch fail validation
   */
  it('should patch fail validation', async () => {
    const patchReq = _.cloneDeep(testPatchReq);
    patchReq.set.id = testSchedule.id;

    // call
    let res = await SchedulesService.patch(testSchedule.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "set.id" is not allowed');
  }).timeout(10000);

  /**
   * patch fail get
   */
  it('should patch fail get', async () => {
    const patchReq = _.cloneDeep(testPatchReq);

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`DbOpsUtils.get called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchedulesService.patch(testSchedule.id, patchReq, _ctx);
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
   * patch fail references
   */
  it('should patch fail references', async () => {
    const patchReq = _.cloneDeep(testPatchReq);

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`DbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testSchedule },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchedulesService.patch(testSchedule.id, patchReq, _ctx);
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
   * patch fail patch
   */
  it('should patch fail patch', async () => {
    const patchReq = _.cloneDeep(testPatchReq);

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`DbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testSchedule },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchObj) => {
      console.log(`DbOpsUtils.patch called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchedulesService.patch(testSchedule.id, patchReq, _ctx);
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
