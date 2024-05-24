const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const EventsConstants = require('../../../services/events/events.constants.js');
const EventsService = require('../../../services/events/events.service.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');

describe('Events Controller', function () {
  before(async function () {});

  beforeEach(async function () {
    sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { status: 200, value: { userID: 'user.id', username: 'user.email' } };
    });
  });

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAll with success
   */
  it('should getAll with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    let stubService = sinon.stub(EventsService, 'getAllForReq').callsFake(() => {
      console.log(`\nEventsService.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: testEvents,
          meta: { count: testEvents.length, skip: 0, limit: 0 },
        },
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${EventsConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      data: [...testEvents],
      meta: {
        count: testEvents.length,
        limit: 0,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * getAll fail validation
   */
  it('should getAll fail validation', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    sinon.restore();
    let stubValidate = sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { status: 401, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    let stubService = sinon.stub(EventsService, 'getAllForReq').callsFake(() => {
      console.log(`\nEventsService.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${EventsConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubValidate.callCount).to.equal(1);
    chai.expect(stubService.callCount).to.equal(0);
    chai.expect(res.body.error).to.include('Test error');
  }).timeout(10000);

  /**
   * getAll fail
   */
  it('should getAll fail', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    let stubService = sinon.stub(EventsService, 'getAllForReq').callsFake(() => {
      console.log(`\nEventsService.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${EventsConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getAll fail exception
   */
  it('should getAll fail exception', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    let stubService = sinon.stub(EventsService, 'getAllForReq').callsFake(() => {
      console.log(`\nEventsService.getAllForReq called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${EventsConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    // stub
    let stubService = sinon.stub(EventsService, 'getOne').callsFake((objID, projection) => {
      console.log(`\nEventsService.getOne called ${JSON.stringify({ objID, projection }, null, 2)}\n`);
      chai.expect(objID).to.equal(testEvent.id);
      chai.expect(projection).to.deep.equal({ _id: 0 });
      return {
        status: 200,
        value: testEvent,
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${EventsConstants.ApiPath}/${testEvent.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testEvent,
    });
  }).timeout(10000);

  /**
   * getOne with success and projection
   */
  it('should getOne with success and projection', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    // stub
    let stubService = sinon.stub(EventsService, 'getOne').callsFake((objID, projection) => {
      console.log(`\nEventsService.getOne called ${JSON.stringify({ objID, projection }, null, 2)}\n`);
      chai.expect(objID).to.equal(testEvent.id);
      chai.expect(projection).to.deep.equal({ id: 1, name: 1, _id: 0 });
      return {
        status: 200,
        value: testEvent,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${EventsConstants.ApiPath}/${testEvent.id}?projection=id,name`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testEvent,
    });
  }).timeout(10000);

  /**
   * getOne fail buildFilterFromReq
   */
  it('should getOne fail buildFilterFromReq', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    // stub
    let stubBuildFilter = sinon.stub(RestApiUtils, 'buildFilterFromReq').callsFake(() => {
      console.log(`\nRestApiUtils.buildFilterFromReq\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${EventsConstants.ApiPath}/${testEvent.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubBuildFilter.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getOne fail getOne
   */
  it('should getOne fail getOne', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    // stub
    let stubService = sinon.stub(EventsService, 'getOne').callsFake(() => {
      console.log(`\nEventsService.getOne called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${EventsConstants.ApiPath}/${testEvent.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getOne fail exception
   */
  it('should getOne fail exception', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    // stub
    let stubService = sinon.stub(EventsService, 'getOne').callsFake(() => {
      console.log(`\nEventsService.getOne called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${EventsConstants.ApiPath}/${testEvent.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    // stub
    let stubService = sinon.stub(EventsService, 'post').callsFake(() => {
      console.log(`\nEventsService.post called\n`);
      return {
        status: 201,
        value: { ...testEvent },
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${EventsConstants.ApiPathInternal}`)
      .send({ ...testEvent });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testEvent,
    });
  }).timeout(10000);

  /**
   * post fail
   */
  it('should post fail', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    // stub
    let stubService = sinon.stub(EventsService, 'post').callsFake(() => {
      console.log(`\nEventsService.post called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${EventsConstants.ApiPathInternal}`)
      .send({ ...testEvent });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * post fail exception
   */
  it('should post fail exception', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    // stub
    let stubService = sinon.stub(EventsService, 'post').callsFake(() => {
      console.log(`\nEventsService.post called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${EventsConstants.ApiPathInternal}`)
      .send({ ...testEvent });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * notification with success
   */
  it('should do notification with success', async () => {
    const notifications = _.cloneDeep(TestConstants.EventsNotifications);
    const notif = notifications[0];

    // stub
    let stubService = sinon.stub(EventsService, 'notification').callsFake(() => {
      console.log(`\nEventsService.notification called\n`);
      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${EventsConstants.ApiPathInternal}/notifications`)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal(true);
  }).timeout(10000);

  /**
   * notification fail
   */
  it('should notification fail', async () => {
    const notifications = _.cloneDeep(TestConstants.EventsNotifications);
    const notif = notifications[0];

    // stub
    let stubService = sinon.stub(EventsService, 'notification').callsFake(() => {
      console.log(`\nEventsService.notification called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${EventsConstants.ApiPathInternal}/notifications`)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * notification fail exception
   */
  it('should notification fail exception', async () => {
    const notifications = _.cloneDeep(TestConstants.EventsNotifications);
    const notif = notifications[0];

    // stub
    let stubService = sinon.stub(EventsService, 'notification').callsFake(() => {
      console.log(`\nEventsService.notification called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${EventsConstants.ApiPathInternal}/notifications`)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);
});
