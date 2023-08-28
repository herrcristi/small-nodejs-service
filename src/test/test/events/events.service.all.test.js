const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils');
const TranslationsUtils = require('../../../core/utils/translations.utils');

const TestConstants = require('../../test-constants.js');
const EventsConstants = require('../../../services/events/events.constants.js');
const EventsService = require('../../../services/events/events.service.js');

describe('Events Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Events' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllForReq with success
   */
  it('should getAllForReq with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: _.cloneDeep(testEvents),
          meta: { count: testEvents.length },
        },
      };
    });

    // call
    let res = await EventsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);

    chai.expect(res.status).to.equal(200);
    chai.expect(res.value).to.deep.equal({
      data: _.cloneDeep(testEvents),
      meta: { count: testEvents.length },
    });
  }).timeout(10000);

  /**
   * getAllForReq failed
   */
  it('should getAllForReq failed', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await EventsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * getAll with success
   */
  it('should getAll with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAll').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAll called\n`);
      return {
        status: 200,
        value: _.cloneDeep(testEvents),
      };
    });

    // call
    let res = await EventsService.getAll({ filter: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: _.cloneDeep(testEvents),
    });
  }).timeout(10000);

  /**
   * getAllCount with success
   */
  it('should getAllCount with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllCount').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllCount called\n`);
      return { status: 200, value: 1 };
    });

    // call
    let res = await EventsService.getAllCount({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: 1,
    });
  }).timeout(10000);

  /**
   * getAllByIDs with success
   */
  it('should getAllByIDs with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllByIDs').callsFake((config, ids, projection) => {
      console.log(`\nBaseServiceUtils.getAllByIDs called\n`);
      return {
        status: 200,
        value: _.cloneDeep(testEvents),
      };
    });

    // call
    let res = await EventsService.getAllByIDs(['id1'], { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: _.cloneDeep(testEvents),
    });
  }).timeout(10000);

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getOne').callsFake(() => {
      console.log(`\nBaseServiceUtils.getOne called\n`);
      return { status: 200, value: { ...testEvent } };
    });

    // call
    let res = await EventsService.getOne(testEvent.id, { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testEvent },
    });
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    const postReq = {
      ...testEvent,
      id: undefined,
      type: undefined,
      name: undefined,
      createdTimestamp: undefined,
    };

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'post').callsFake((config, postObj) => {
      console.log(`\nBaseServiceUtils.post called\n`);
      return {
        status: 201,
        value: { ...postObj, id: testEvent.id },
      };
    });

    // call
    let res = await EventsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: { ...testEvent, createdTimestamp: undefined },
    });
  }).timeout(10000);

  /**
   * notification with success
   */
  it('should do notification with success', async () => {
    const notifications = _.cloneDeep(TestConstants.EventsNotifications);
    const notif = notifications[0];

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'notification').callsFake((config, notification) => {
      console.log(`\nBaseServiceUtils.notification called\n`);
      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await EventsService.notification(notif, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * translate with success
   */
  it('should do translate with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    // stub
    let stubString = sinon.stub(TranslationsUtils, 'string').callsFake(() => {
      console.log(`\nTranslationsUtils.string called\n`);
      return {};
    });

    let stubAddTranslations = sinon.stub(TranslationsUtils, 'addTranslations').callsFake((obj, translations) => {
      console.log(`\nTranslationsUtils.addTranslations called\n`);
      return {};
    });

    // call
    let res = await EventsService.translate(testEvent, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubString.callCount).to.equal(2);
    chai.expect(stubAddTranslations.callCount).to.equal(1);
  }).timeout(10000);
});
