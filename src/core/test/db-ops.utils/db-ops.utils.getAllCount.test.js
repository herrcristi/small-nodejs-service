const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');

const DbOpsUtils = require('../../utils/db-ops.utils.js');

describe('DB-Ops Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  const config = {
    serviceName: 'service',
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllCount success
   */
  it('should getAllCount with success', async () => {
    let filter = {
      filter: {},
      projection: { _id: 0 },
      limit: 0,
      skip: 0,
      sort: { id: 1 },
    };

    let collection = {};
    collection.count = sinon.stub().returns(5);

    // call
    let res = await DbOpsUtils.getAllCount({ ...config, collection }, filter, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.count.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: 5,
    });
  }).timeout(10000);

  /**
   * getAllCount exception
   */
  it('should getAllCount exception', async () => {
    let filter = {
      filter: {},
      projection: { _id: 0 },
      limit: 0,
      skip: 0,
      sort: { id: 1 },
    };

    let collection = {};
    collection.count = sinon.stub().throws('Test exception');

    // call
    let res = await DbOpsUtils.getAllCount({ ...config, collection }, filter, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message.toString()).to.include('Test exception');
  }).timeout(10000);
});
