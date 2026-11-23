const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const LocationsService = require('../../../services/locations/locations.service.js');

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
   * getAllByIDs with success, with the options of the caller
   */
  it('should getAllByIDs with success', async () => {
    const testLocations = _.cloneDeep(TestConstants.Locations);
    const testLocationsIDs = testLocations.map((item) => item.id);

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake(() => {
      console.log(`\nDbOpsUtils.getAllByIDs called\n`);
      return { status: 200, value: [...testLocations] };
    });

    // call
    const options = { readPreference: DbOpsUtils.Constants.ReadPrimary };
    let res = await LocationsService.getAllByIDs(testLocationsIDs, { id: 1 }, _ctx, options);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the options of the caller go to the read (populateReferences asks the primary)
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubBase.firstCall.args[4]).to.deep.equal(options);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: [...testLocations],
    });
  }).timeout(10000);

  /**
   * getAllByIDs failed no tenant
   */
  it('should getAllByIDs failed tenant', async () => {
    // call
    let res = await LocationsService.getAllByIDs([], {}, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);
});
