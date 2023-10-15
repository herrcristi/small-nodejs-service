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
   * delete success
   */
  it('should delete with success', async () => {
    let projection = { _id: 0 };

    let collection = {};
    collection.findOneAndDelete = sinon.stub().returns({
      value: {
        id: 'id1',
        name: 'name',
        status: 'active',
        prop: 'prop1',
      },
    });

    // call
    let res = await DbOpsUtils.delete({ ...config, collection }, 'id1', projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.findOneAndDelete.callCount).to.equal(1);
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
   * delete not found
   */
  it('should delete not found', async () => {
    let projection = { _id: 0 };

    let collection = {};
    collection.findOneAndDelete = sinon.stub().returns({
      lastErrorObject: { n: 0 },
    });

    // call
    let res = await DbOpsUtils.delete({ ...config, collection }, 'id1', projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.findOneAndDelete.callCount).to.equal(1);
    chai.expect(res.status).to.equal(404);
    chai.expect(res.error.message.toString()).to.include('Not found');
  }).timeout(10000);

  /**
   * delete exception
   */
  it('should delete exception', async () => {
    let projection = { _id: 0 };

    let collection = {};
    collection.findOneAndDelete = sinon.stub().throws('Test exception');

    // call
    let res = await DbOpsUtils.delete({ ...config, collection }, 'id1', projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message.toString()).to.include('Test exception');
  }).timeout(10000);
});
