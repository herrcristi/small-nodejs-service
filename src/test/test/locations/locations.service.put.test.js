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
const LocationsConstants = require('../../../services/locations/locations.constants.js');
const LocationsService = require('../../../services/locations/locations.service.js');
const LocationsRest = require('../../../services/rest/locations.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Locations Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Locations' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * put with success
   */
  it('should put with success', async () => {
    const testLocations = _.cloneDeep(TestConstants.Locations);
    const testLocation = testLocations[0];

    const putReq = {
      ...testLocation,
    };
    delete putReq.id;
    delete putReq.type;
    delete putReq._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, putObj) => {
      console.log(`\nDbOpsUtils.put called`);
      return {
        status: 200,
        value: { ...testLocation },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubLocationsRest = sinon.stub(LocationsRest, 'raiseNotification').callsFake(() => {
      console.log(`\nLocationsRest raiseNotification called`);
    });

    // call
    let res = await LocationsService.put(testLocation.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubLocationsRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testLocation.id,
        name: testLocation.name,
        type: testLocation.type,
        status: testLocation.status,
        address: testLocation.address,
      },
    });
  }).timeout(10000);

  /**
   * put failed no tenant
   */
  it('should put failed tenant', async () => {
    // call
    let res = await LocationsService.put('id', {}, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * put fail validation
   */
  it('should put fail validation', async () => {
    const testLocations = _.cloneDeep(TestConstants.Locations);
    const testLocation = testLocations[0];

    const putReq = {
      ...testLocation,
    };

    // call
    let res = await LocationsService.put(testLocation.id, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "id" is not allowed');
  }).timeout(10000);

  /**
   * put fail references
   */
  it('should put fail references', async () => {
    const testLocations = _.cloneDeep(TestConstants.Locations);
    const testLocation = testLocations[0];

    const putReq = {
      ...testLocation,
    };
    delete putReq.id;
    delete putReq.type;
    delete putReq._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await LocationsService.put(testLocation.id, putReq, _ctx);
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
   * put fail put
   */
  it('should put fail put', async () => {
    const testLocations = _.cloneDeep(TestConstants.Locations);
    const testLocation = testLocations[0];

    const putReq = {
      ...testLocation,
    };
    delete putReq.id;
    delete putReq.type;
    delete putReq._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, putObj) => {
      console.log(`\nDbOpsUtils.put called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await LocationsService.put(testLocation.id, putReq, _ctx);
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
