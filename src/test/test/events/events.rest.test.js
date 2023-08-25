const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const RestCommsUtils = require('../../../core/utils/rest-communications.utils.js');
const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');

const TestConstants = require('../../test-constants.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Events Rest', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Events' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * rest getAll
   */
  it('should call getAll via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'getAll').callsFake(() => {
      console.log(`\nRestCommUtils.getAll called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await EventsRest.getAll('?', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest getAllByIDs
   */
  it('should call getAllByIDs via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'getAllByIDs').callsFake(() => {
      console.log(`\nRestCommUtils.getAllByIDs  called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await EventsRest.getAllByIDs(['id1'], { id: 1, name: 1 } /*projection*/, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest getOne
   */
  it('should call getOne via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'getOne').callsFake(() => {
      console.log(`\nRestCommUtils.getOne  called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await EventsRest.getOne('id1', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest post
   */
  it('should post a call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'post').callsFake(() => {
      console.log(`\nRestCommUtils.post called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await EventsRest.post({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest notification
   */
  it('should do notification a call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'notification').callsFake(() => {
      console.log(`\nRestCommUtils.notification called\n`);
      return { status: 200, value: true };
    });

    // call
    let res = await EventsRest.notification({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal(true);
  }).timeout(10000);

  /**
   * subscribe
   */
  it('should do subscribe', async () => {
    // call
    let res = await EventsRest.subscribe({ callback: null, projection: { id: 1 } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check

    chai.expect(res?.value).to.equal(true);
  }).timeout(10000);

  /**
   * consume
   */
  it('should do consume', async () => {
    // stub
    let stub = sinon.stub(NotificationsUtils, 'consume').callsFake(() => {
      console.log(`\nNotificationsUtils.consume called\n`);
      return { status: 200, value: true };
    });

    // call
    let res = await EventsRest.consume({ callback: null, projection: { id: 1 } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal(true);
  }).timeout(10000);

  /**
   * raiseNotification
   */
  it('should do raiseNotification', async () => {
    // stub
    let stub = sinon.stub(NotificationsUtils, 'raiseNotification').callsFake(() => {
      console.log(`\nNotificationsUtils.raiseNotification called\n`);
      return { status: 200, value: true };
    });

    // call
    let res = await EventsRest.raiseNotification(
      NotificationsUtils.Constants.Notification.Added,
      [{ id: 'id1' }],
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal(true);
  }).timeout(10000);
});
