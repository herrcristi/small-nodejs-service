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

describe('Events Controller', function () {
  before(async function () {});

  beforeEach(async function () {});

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
    let stubService = sinon.stub(EventsService, 'getAllForReq').callsFake((filter) => {
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
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    // stub
    let stubService = sinon.stub(EventsService, 'getOne').callsFake(() => {
      console.log(`\nEventsService.getOne called\n`);
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
});
