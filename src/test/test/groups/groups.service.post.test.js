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
   * post with success
   */
  it('should post with success', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    const postReq = {
      ...testGroup,
      students: [{ id: testGroup.students[0].id }],
    };
    delete postReq.id;
    delete postReq.type;
    delete postReq.schedules;
    delete postReq._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`\nDbOpsUtils.post called`);
      return {
        status: 201,
        value: { ...postObj, id: testGroup.id },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubGroupsRest = sinon.stub(GroupsRest, 'raiseNotification').callsFake(() => {
      console.log(`\nGroupsRest raiseNotification called`);
    });

    // call
    let res = await GroupsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubGroupsRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        id: testGroup.id,
        name: testGroup.name,
        type: testGroup.type,
        status: testGroup.status,
      },
    });
  }).timeout(10000);

  /**
   * post with success with defaults
   */
  it('should post with success with defaults', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    const postReq = {
      ...testGroup,
      students: [{ id: testGroup.students[0].id }],
    };
    delete postReq.id;
    delete postReq.type;
    delete postReq.schedules;
    delete postReq.status;
    delete postReq._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`\nDbOpsUtils.post called`);
      return {
        status: 201,
        value: { ...postObj, id: testGroup.id },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubGroupsRest = sinon.stub(GroupsRest, 'raiseNotification').callsFake(() => {
      console.log(`\nGroupsRest raiseNotification called`);
    });

    // call
    let res = await GroupsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubGroupsRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        id: testGroup.id,
        name: testGroup.name,
        type: testGroup.type,
        status: GroupsConstants.Status.Pending,
      },
    });
  }).timeout(10000);

  /**
   * post failed no tenant
   */
  it('should post failed tenant', async () => {
    // call
    let res = await GroupsService.post({}, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * post fail validation
   */
  it('should post fail validation', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    const postReq = {
      ...testGroup,
      students: [{ id: testGroup.students[0].id }],
    };

    // call
    let res = await GroupsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "id" is not allowed');
  }).timeout(10000);

  /**
   * post fail references
   */
  it('should post fail references', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    const postReq = {
      ...testGroup,
      students: [{ id: testGroup.students[0].id }],
    };
    delete postReq.id;
    delete postReq.type;
    delete postReq.schedules;
    delete postReq._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await GroupsService.post(postReq, _ctx);
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
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    const postReq = {
      ...testGroup,
      students: [{ id: testGroup.students[0].id }],
    };
    delete postReq.id;
    delete postReq.type;
    delete postReq.schedules;
    delete postReq._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`\nDbOpsUtils.post called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await GroupsService.post(postReq, _ctx);
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
