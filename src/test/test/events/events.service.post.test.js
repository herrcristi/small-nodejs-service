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
const EventsConstants = require('../../../services/events/events.constants.js');
const EventsService = require('../../../services/events/events.service.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Events Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Events' };

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
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    const postReq = {
      ...testEvent,
    };
    delete postReq.id;
    delete postReq.type;
    delete postReq.createdTimestamp;
    delete postReq._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`DbOpsUtils.post called`);
      return {
        status: 201,
        value: { ...postObj, id: testEvent.id },
      };
    });

    let stubEventsRest = sinon.stub(EventsRest, 'raiseNotification').callsFake(() => {
      console.log(`EventsRest raiseNotification called`);
    });

    // call
    let res = await EventsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEventsRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        id: testEvent.id,
        name: testEvent.name,
        type: testEvent.type,
      },
    });
  }).timeout(10000);

  /**
   * post with success with defaults
   */
  it('should post with success with defaults', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    const postReq = {
      ...testEvent,
    };
    delete postReq.id;
    delete postReq.type;
    delete postReq.status;
    delete postReq.createdTimestamp;
    delete postReq._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`DbOpsUtils.post called`);
      return {
        status: 201,
        value: { ...postObj, id: testEvent.id },
      };
    });

    let stubEventsRest = sinon.stub(EventsRest, 'raiseNotification').callsFake(() => {
      console.log(`EventsRest raiseNotification called`);
    });

    // call
    let res = await EventsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEventsRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        id: testEvent.id,
        name: testEvent.name,
        type: testEvent.type,
      },
    });
  }).timeout(10000);

  /**
   * post fail validation
   */
  it('should post fail validation', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    const postReq = {
      ...testEvent,
    };

    // call
    let res = await EventsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "id" is not allowed');
  }).timeout(10000);

  /**
   * post fail references
   */
  it('should post fail references', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    const postReq = {
      ...testEvent,
    };
    delete postReq.id;
    delete postReq.type;
    delete postReq.createdTimestamp;
    delete postReq._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await EventsService.post(postReq, _ctx);
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
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    const postReq = {
      ...testEvent,
    };
    delete postReq.id;
    delete postReq.type;
    delete postReq.createdTimestamp;
    delete postReq._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`DbOpsUtils.post called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await EventsService.post(postReq, _ctx);
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
