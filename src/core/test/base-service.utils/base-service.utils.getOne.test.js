const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const BaseServiceUtils = require('../../utils/base-service.utils.js');
const DbOpsUtils = require('../../utils/db-ops.utils.js');

describe('Base Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  const config = {
    serviceName: 'service',
    schema: 'schema',
    collection: 'collection',
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getOne with success
   */
  it('should call getOne with success', async () => {
    // stub
    sinon.stub(DbOpsUtils, 'getOne').returns({
      status: 200,
      value: { id: 'id1' },
    });

    // call
    let res = await BaseServiceUtils.getOne(config, 'id1', { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { id: 'id1' },
    });
  }).timeout(10000);
});
