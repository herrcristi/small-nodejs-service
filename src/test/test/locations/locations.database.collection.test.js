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
const LocationsService = require('../../../services/locations/locations.service.js');
const LocationsDatabase = require('../../../services/locations/locations.database.js');

describe('Locations Database', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Locations' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * collection failed no tenant
   */
  it('should collection failed tenant', async () => {
    // call
    let res = await LocationsDatabase.collection({ ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(null);
  }).timeout(10000);
});
