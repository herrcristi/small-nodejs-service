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
   * post success
   */
  it('should post with success', async () => {
    let objInfo = {
      id: 'id1',
      name: 'name1',
    };

    let collection = {};
    collection.insertOne = sinon.stub().returns({
      insertedId: '0123',
    });

    // call
    let res = await DbOpsUtils.post({ ...config, collection }, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.value.createdTimestamp).to.exist;
    chai.expect(res.value.lastModifiedTimestamp).to.exist;

    delete res.time;
    delete res.value.createdTimestamp;
    delete res.value.lastModifiedTimestamp;
    chai.expect(collection.insertOne.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        id: 'id1',
        name: 'name1',
      },
    });
  }).timeout(10000);

  /**
   * post not inserted
   */
  it('should post not inserted', async () => {
    let objInfo = {
      name: 'name1',
    };

    let collection = {};
    collection.insertOne = sinon.stub().returns(null);

    // call
    let res = await DbOpsUtils.post({ ...config, collection }, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.insertOne.callCount).to.equal(1);
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message.toString()).to.include('Database insert failed');
  }).timeout(10000);

  /**
   * post exception
   */
  it('should post exception', async () => {
    let objInfo = {
      id: 'id1',
      name: 'name1',
    };

    let collection = {};
    collection.insertOne = sinon.stub().throws('Test exception');

    // call
    let res = await DbOpsUtils.post({ ...config, collection }, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message.toString()).to.include('Test exception');
  }).timeout(10000);
});
