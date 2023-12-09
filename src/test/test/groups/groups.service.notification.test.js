const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');
const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const TestConstants = require('../../test-constants.js');
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
   * notification with success
   */
  it('should do notification with success', async () => {
    const notifications = _.cloneDeep(TestConstants.GroupsNotifications);
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
    let res = await GroupsService.notification(notif, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * notification failed no tenant
   */
  it('should notification failed tenant', async () => {
    // call
    let res = await GroupsService.notification({}, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * notification fail validation
   */
  it('should notification fail validation', async () => {
    const notifications = _.cloneDeep(TestConstants.GroupsNotifications);
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
    let res = await GroupsService.notification(notif, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(0);
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "serviceName" is required');
  }).timeout(10000);

  /**
   * notification schedules
   */
  it('should do notification schedules', async () => {
    const notifications = _.cloneDeep(TestConstants.SchedulesNotifications);
    const notif = notifications[0];

    // stub
    let stubNotification = sinon.stub(NotificationsUtils, 'notification').callsFake((config, notification, ctx) => {
      console.log(`\nNotificationsUtils.notification called\n`);

      chai.expect(notification).to.deep.equal(notif);
      chai.expect(ctx.tenantID).to.deep.equal(_ctx.tenantID);

      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await GroupsService.notification(notif, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubNotification.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);
});
