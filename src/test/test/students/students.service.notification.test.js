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
const StudentsService = require('../../../services/students/students.service.js');
const StudentsRest = require('../../../services/rest/students.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Students Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Students' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * notification with success for modified
   */
  it('should do notification with success', async () => {
    const notifications = _.cloneDeep(TestConstants.UsersNotifications);
    const notif = notifications[0];
    const userID = notif.modified[0].id;
    const username = notif.modified[0].name;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake((config, ids) => {
      console.log(`\nDbOpsUtils.getAllByIDs called. ids: ${JSON.stringify(ids, null, 2)}\n`);
      chai.expect(ids).to.have.deep.members([userID]);

      return {
        status: 200,
        value: [],
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake((config, objInfo) => {
      console.log(`\nReferencesUtils.populateReferences called\n`);
      objInfo.name = username;
      return { status: 200, value: true };
    });

    let stubPost = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`DbOpsUtils.post called: ${JSON.stringify(postObj, null, 2)}`);
      return {
        status: 201,
        value: { ...postObj, id: userID },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    let stubStudentsRest = sinon.stub(StudentsRest, 'raiseNotification').callsFake(() => {
      console.log(`StudentsRest raiseNotification called`);
    });

    let stubNotification = sinon.stub(NotificationsUtils, 'notification').callsFake((config, notification, ctx) => {
      console.log(`\nNotificationsUtils.notification called\n`);
      chai.expect(ctx.tenantID).to.equal(notif.modified[0].schools[0].id);
      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await StudentsService.notification(notif, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubPost.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubStudentsRest.callCount).to.equal(1);
    chai.expect(stubNotification.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * notification with success for added
   */
  it('should do notification with success for added', async () => {
    const notifications = _.cloneDeep(TestConstants.UsersNotifications);
    const notif = notifications[0];
    const userID = notif.modified[0].id;
    const username = notif.modified[0].name;
    notif.added = notif.modified;
    delete notif.modified;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake((config, ids) => {
      console.log(`\nDbOpsUtils.getAllByIDs called. ids: ${JSON.stringify(ids, null, 2)}\n`);
      chai.expect(ids).to.have.deep.members([userID]);

      return {
        status: 200,
        value: [],
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake((config, objInfo) => {
      console.log(`\nReferencesUtils.populateReferences called\n`);
      objInfo.name = username;
      return { status: 200, value: true };
    });

    let stubPost = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`DbOpsUtils.post called: ${JSON.stringify(postObj, null, 2)}`);
      return {
        status: 201,
        value: { ...postObj, id: userID },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    let stubStudentsRest = sinon.stub(StudentsRest, 'raiseNotification').callsFake(() => {
      console.log(`StudentsRest raiseNotification called`);
    });

    let stubNotification = sinon.stub(NotificationsUtils, 'notification').callsFake((config, notification, ctx) => {
      console.log(`\nNotificationsUtils.notification called\n`);
      chai.expect(ctx.tenantID).to.equal(notif.added[0].schools[0].id);
      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await StudentsService.notification(notif, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubPost.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubStudentsRest.callCount).to.equal(1);
    chai.expect(stubNotification.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * notification fail validation
   */
  it('should notification fail validation', async () => {
    const notifications = _.cloneDeep(TestConstants.UsersNotifications);
    const notif = notifications[0];
    delete notif.serviceName;

    // call
    let res = await StudentsService.notification(notif, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "serviceName" is required');
  }).timeout(10000);

  /**
   * notification fail error
   */
  it('should do notification fail error', async () => {
    const notifications = _.cloneDeep(TestConstants.UsersNotifications);
    const notif = notifications[0];
    const userID = notif.modified[0].id;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake((config, ids) => {
      console.log(`\nDbOpsUtils.getAllByIDs called. ids: ${JSON.stringify(ids, null, 2)}\n`);
      chai.expect(ids).to.have.deep.members([userID]);

      return {
        status: 500,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await StudentsService.notification(notif, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error').toString() },
    });
  }).timeout(10000);

  /**
   * notification non user
   */
  it('should do notification non user', async () => {
    const notifications = _.cloneDeep(TestConstants.StudentsNotifications);
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
    let res = await StudentsService.notification(notif, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubNotification.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * notification non user and fail
   */
  it('should do notification non user and fail', async () => {
    const notifications = _.cloneDeep(TestConstants.StudentsNotifications);
    const notif = notifications[0];

    // stub
    let stubNotification = sinon.stub(NotificationsUtils, 'notification').callsFake((config, notification, ctx) => {
      console.log(`\nNotificationsUtils.notification called\n`);

      chai.expect(notification).to.deep.equal(notif);
      chai.expect(ctx.tenantID).to.deep.equal(_ctx.tenantID);

      return {
        status: 500,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await StudentsService.notification(notif, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubNotification.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error').toString() },
    });
  }).timeout(10000);
});