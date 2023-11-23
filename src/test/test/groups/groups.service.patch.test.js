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
const GroupsConstants = require('../../../services/groups/groups.constants.js');
const GroupsService = require('../../../services/groups/groups.service.js');
const GroupsRest = require('../../../services/rest/groups.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Groups Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Groups' };

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
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    const patchReq = {
      set: {
        ...testGroup,
        students: [{ id: testGroup.students[0].id }],
      },
    };
    delete patchReq.set.id;
    delete patchReq.set.type;
    delete patchReq.set._lang_en;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`DbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testGroup },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchObj) => {
      console.log(`DbOpsUtils.patch called`);
      return {
        status: 200,
        value: { ...testGroup },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    let stubGroupsRest = sinon.stub(GroupsRest, 'raiseNotification').callsFake(() => {
      console.log(`GroupsRest raiseNotification called`);
    });

    // call
    let res = await GroupsService.patch(testGroup.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubGroupsRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testGroup.id,
        name: testGroup.name,
        type: testGroup.type,
        status: testGroup.status,
      },
    });
  }).timeout(10000);

  /**
   * patch with success with removed notif
   */
  it('should patch with success with removed notif', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    const patchReq = {
      set: {
        ...testGroup,
        students: [], // no more students
      },
    };
    delete patchReq.set.id;
    delete patchReq.set.type;
    delete patchReq.set._lang_en;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`DbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testGroup },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchObj) => {
      console.log(`DbOpsUtils.patch called`);
      return {
        status: 200,
        value: { ...testGroup, ...patchReq.set },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    let stubGroupsRest = sinon.stub(GroupsRest, 'raiseNotification');
    stubGroupsRest.onCall(0).callsFake((notificationType, objs) => {
      console.log(`GroupsRest raiseNotification called`);
      console.log(`NotificationType: ${JSON.stringify(notificationType, null, 2)}`);
      console.log(`Notifications: ${JSON.stringify(objs, null, 2)}`);

      chai.expect(notificationType).to.equal(NotificationsUtils.Constants.Notification.Modified);
      chai.expect(objs).to.deep.equal([
        {
          id: testGroup.id,
          name: testGroup.name,
          type: testGroup.type,
          status: testGroup.status,
          students: patchReq.set.students,
        },
      ]);
    });
    stubGroupsRest.onCall(1).callsFake((notificationType, objs) => {
      console.log(`GroupsRest raiseNotification called`);
      console.log(`NotificationType: ${JSON.stringify(notificationType, null, 2)}`);
      console.log(`Notifications: ${JSON.stringify(objs, null, 2)}`);

      chai.expect(notificationType).to.equal(NotificationsUtils.Constants.Notification.Removed);
      chai.expect(objs).to.deep.equal([
        {
          id: testGroup.id,
          name: testGroup.name,
          type: testGroup.type,
          status: testGroup.status,
          students: [testGroup.students[0]],
        },
      ]);
    });

    // call
    let res = await GroupsService.patch(testGroup.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubGroupsRest.callCount).to.equal(2);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testGroup.id,
        name: testGroup.name,
        type: testGroup.type,
        status: testGroup.status,
      },
    });
  }).timeout(10000);

  /**
   * patch failed no tenant
   */
  it('should patch failed tenant', async () => {
    // call
    let res = await GroupsService.patch('id', {}, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * patch fail validation
   */
  it('should patch fail validation', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    const patchReq = {
      set: {
        ...testGroup,
        students: [{ id: testGroup.students[0].id }],
      },
    };

    // call
    let res = await GroupsService.patch(testGroup.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "set.id" is not allowed');
  }).timeout(10000);

  /**
   * patch fail get
   */
  it('should patch fail get', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    const patchReq = {
      set: {
        ...testGroup,
        students: [{ id: testGroup.students[0].id }],
      },
    };
    delete patchReq.set.id;
    delete patchReq.set.type;
    delete patchReq.set._lang_en;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`DbOpsUtils.get called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await GroupsService.patch(testGroup.id, patchReq, _ctx);
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
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    const patchReq = {
      set: {
        ...testGroup,
        students: [{ id: testGroup.students[0].id }],
      },
    };
    delete patchReq.set.id;
    delete patchReq.set.type;
    delete patchReq.set._lang_en;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`DbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testGroup },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await GroupsService.patch(testGroup.id, patchReq, _ctx);
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
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    const patchReq = {
      set: {
        ...testGroup,
        students: [{ id: testGroup.students[0].id }],
      },
    };
    delete patchReq.set.id;
    delete patchReq.set.type;
    delete patchReq.set._lang_en;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`DbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testGroup },
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
    let res = await GroupsService.patch(testGroup.id, patchReq, _ctx);
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
