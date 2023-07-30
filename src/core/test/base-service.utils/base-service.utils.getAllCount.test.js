const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');
const BaseServiceUtils = require('../../utils/base-service.utils.js');
const RestApiUtils = require('../../utils/rest-api.utils.js');
const DbOpsUtils = require('../../utils/db-ops.utils.js');

describe('Base Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  const config = {
    serviceName: 'service',
    schema: 'schema',
    collection: 'collection',
    references: [{ fieldName: 'field', service: { getAllByIDs: () => {} }, projection: null /*default*/ }],
    fillReferences: false,
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllCount with success
   */
  it('should call getAllCount with success', async () => {
    let filter = { filter: {} };

    // stub
    sinon.stub(DbOpsUtils, 'getAllCount').returns({
      status: 200,
      value: 1,
    });

    // call
    let res = await BaseServiceUtils.getAllCount(config, filter, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: 1,
    });
  }).timeout(10000);
});
