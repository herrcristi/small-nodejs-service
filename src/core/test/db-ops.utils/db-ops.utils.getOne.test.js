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
   * getOne success
   */
  it('should getOne with success', async () => {
    let projection = { _id: 0 };

    let collection = {};
    collection.findOne = sinon.stub().returns({
      id: 'id1',
      name: 'name',
      status: 'active',
      prop: 'prop1',
    });

    // call
    let res = await DbOpsUtils.getOne({ ...config, collection }, 'id1', projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.findOne.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: 'id1',
        name: 'name',
        status: 'active',
        prop: 'prop1',
      },
    });
  }).timeout(10000);

  /**
   * getOne not found
   */
  it('should getOne not found', async () => {
    let projection = { _id: 0 };

    let collection = {};
    collection.findOne = sinon.stub().returns(null);

    // call
    let res = await DbOpsUtils.getOne({ ...config, collection }, 'id1', projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.findOne.callCount).to.equal(1);
    chai.expect(res.status).to.equal(404);
    chai.expect(res.error.message.toString()).to.include('Not found');
  }).timeout(10000);

  /**
   * getOne exception
   */
  it('should getOne exception', async () => {
    let projection = { _id: 0 };

    let collection = {};
    collection.findOne = sinon.stub().throws('Test exception');

    // call
    let res = await DbOpsUtils.getOne({ ...config, collection }, 'id1', projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message.toString()).to.include('Test exception');
  }).timeout(10000);
});
