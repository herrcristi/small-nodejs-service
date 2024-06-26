const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils.js');
const TranslationsUtils = require('../../../core/utils/translations.utils.js');
const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const SchedulesConstants = require('../../../services/schedules/schedules.constants.js');
const SchedulesService = require('../../../services/schedules/schedules.service.js');
const SchedulesRest = require('../../../services/rest/schedules.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Schedules Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Schedules' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testSchedules = _.cloneDeep(TestConstants.Schedules);
    const testSchedule = testSchedules[0];

    let stubBase = sinon.stub(DbOpsUtils, 'delete').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.delete called`);
      return {
        status: 200,
        value: { ...testSchedule },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubSchedulesRest = sinon.stub(SchedulesRest, 'raiseNotification').callsFake(() => {
      console.log(`\nSchedulesRest raiseNotification called`);
    });

    // call
    let res = await SchedulesService.delete(testSchedule.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubSchedulesRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testSchedule.id,
        name: testSchedule.name,
        type: testSchedule.type,
        status: testSchedule.status,
        class: testSchedule.class,
      },
    });
  }).timeout(10000);

  /**
   * delete failed no tenant
   */
  it('should delete failed tenant', async () => {
    // call
    let res = await SchedulesService.delete('id', { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * delete fail
   */
  it('should delete fail ', async () => {
    const testSchedules = _.cloneDeep(TestConstants.Schedules);
    const testSchedule = testSchedules[0];

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'delete').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.delete called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchedulesService.delete(testSchedule.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
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
