const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');

const TestConstants = require('../../test-constants.js');
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
   * notification with success
   */
  it('should do notification with success', async () => {
    const notifications = _.cloneDeep(TestConstants.EventsNotifications);
    const notif = notifications[0];

    // stub
    let stubBase = sinon.stub(NotificationsUtils, 'notification').callsFake((config, notification) => {
      console.log(`\nNotificationsUtils.notification called\n`);
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
   * notification fail validation
   */
  it('should notification fail validation', async () => {
    const notifications = _.cloneDeep(TestConstants.EventsNotifications);
    const notif = notifications[0];
    delete notif.serviceName;

    // stub
    let stubBase = sinon.stub(NotificationsUtils, 'notification').callsFake((config, notification) => {
      console.log(`\nNotificationsUtils.notification called\n`);
      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await EventsService.notification(notif, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(0);
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "serviceName" is required');
  }).timeout(10000);
});
