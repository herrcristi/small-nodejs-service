const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');

const DbOpsUtils = require('../../utils/db-ops.utils.js');
const DbOpsArrayUtils = require('../../utils/db-ops.array.utils.js');

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
   * patch success
   */
  it('should patch with success', async () => {
    let projection = { _id: 0 };

    let patchInfo = {
      set: {
        name: 'name',
      },
      unset: ['description'],
      add: {
        ids: ['id1'],
      },
      remove: {
        ids: ['id2'],
      },
    };

    let collection = {};
    collection.bulkWrite = sinon.stub().callsFake((ops) => {
      console.log(`Current ops ${JSON.stringify(ops, null, 2)}`);
      chai.expect(ops.length).to.equal(2);

      return {
        matchedCount: 1,
      };
    });
    collection.findOneAndUpdate = sinon.stub().returns({
      value: {
        id: 'id1',
        name: 'name',
        status: 'active',
        prop: 'prop1',
      },
    });

    sinon.stub(DbOpsArrayUtils, 'getPushBulkOpsFromArray').returns([]);
    sinon.stub(DbOpsArrayUtils, 'getPullBulkOpsFromArray').returns([]);

    // call
    let res = await DbOpsUtils.patch({ ...config, collection }, 'id1', patchInfo, projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.bulkWrite.callCount).to.equal(1);
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
   * patch not found bulk
   */
  it('should patch not found bulk', async () => {
    let projection = { _id: 0 };

    let patchInfo = {
      set: {
        name: 'name',
      },
    };

    let collection = {};
    collection.bulkWrite = sinon.stub().callsFake((ops) => {
      console.log(`Current ops ${JSON.stringify(ops, null, 2)}`);
      chai.expect(ops.length).to.equal(1);

      return {
        matchedCount: 0,
      };
    });
    collection.findOneAndUpdate = sinon.stub().returns({
      id: 'id1',
      name: 'name',
      status: 'active',
      prop: 'prop1',
    });

    sinon.stub(DbOpsArrayUtils, 'getPushBulkOpsFromArray').returns([]);
    sinon.stub(DbOpsArrayUtils, 'getPullBulkOpsFromArray').returns([]);

    // call
    let res = await DbOpsUtils.patch({ ...config, collection }, 'id1', patchInfo, projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.bulkWrite.callCount).to.equal(1);
    chai.expect(collection.findOneAndUpdate.callCount).to.equal(0);
    chai.expect(res.status).to.equal(404);
    chai.expect(res.error.message.toString()).to.include('Not found: patch');
  }).timeout(10000);

  /**
   * patch not found get
   */
  it('should patch not found get', async () => {
    let projection = { _id: 0 };

    let patchInfo = {};

    let collection = {};
    collection.bulkWrite = sinon.stub().callsFake((ops) => {
      console.log(`Current ops ${JSON.stringify(ops, null, 2)}`);
      chai.expect(ops.length).to.equal(3);

      return {
        matchedCount: 1,
      };
    });
    collection.findOneAndUpdate = sinon.stub().returns({
      lastErrorObject: { n: 0 },
    });

    sinon.stub(DbOpsArrayUtils, 'getPushBulkOpsFromArray').returns([]);
    sinon.stub(DbOpsArrayUtils, 'getPullBulkOpsFromArray').returns([]);

    // call
    let res = await DbOpsUtils.patch({ ...config, collection }, 'id1', patchInfo, projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.bulkWrite.callCount).to.equal(0); // no patch
    chai.expect(collection.findOneAndUpdate.callCount).to.equal(1);
    chai.expect(res.status).to.equal(404);
    chai.expect(res.error.message.toString()).to.include('Not found: id1');
  }).timeout(10000);

  /**
   * patch exception
   */
  it('should patch exception', async () => {
    let projection = { _id: 0 };

    let patchInfo = {
      set: {
        name: 'name',
      },
    };

    let collection = {};
    collection.bulkWrite = sinon.stub().throws('Test exception');

    // call
    let res = await DbOpsUtils.patch({ ...config, collection }, 'id1', patchInfo, projection, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message.toString()).to.include('Test exception');
  }).timeout(10000);
});
