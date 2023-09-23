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
   * put success
   */
  it('should put with success', async () => {
    let projection = { _id: 0 };

    let objInfo = {
      name: 'name',
    };

    let collection = {};
    collection.findOneAndUpdate = sinon.stub().returns({
      value: {
        id: 'id1',
        name: 'name',
        status: 'active',
        prop: 'prop1',
      },
    });

    // call
    let res = await DbOpsUtils.put({ ...config, collection }, 'id1', objInfo, projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.findOneAndUpdate.callCount).to.equal(1);
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
   * put not found
   */
  it('should put not found', async () => {
    let projection = { _id: 0 };

    let collection = {};
    collection.findOneAndUpdate = sinon.stub().returns({
      lastErrorObject: { n: 0 },
    });

    // call
    let res = await DbOpsUtils.put({ ...config, collection }, 'id1', projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.findOneAndUpdate.callCount).to.equal(1);
    chai.expect(res.status).to.equal(404);
    chai.expect(res.error.message.toString()).to.include('Not found');
  }).timeout(10000);

  /**
   * put exception
   */
  it('should put exception', async () => {
    let projection = { _id: 0 };

    let collection = {};
    collection.findOneAndUpdate = sinon.stub().throws('Test exception');

    // call
    let res = await DbOpsUtils.put({ ...config, collection }, 'id1', projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message.toString()).to.include('Test exception');
  }).timeout(10000);

  /**
   * put exception no stack
   */
  it('should put exception no stack', async () => {
    let projection = { _id: 0 };

    let collection = {};
    collection.findOneAndUpdate = sinon.stub().callsFake(() => {
      throw 'Test exception';
    });

    // call
    let res = await DbOpsUtils.put({ ...config, collection }, 'id1', projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message.toString()).to.include('Test exception');
  }).timeout(10000);
});
