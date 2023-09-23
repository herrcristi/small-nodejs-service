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
   * getAll success
   */
  it('should getAll with success', async () => {
    let filter = {
      filter: {},
      projection: { _id: 0 },
      limit: 0,
      skip: 0,
      sort: { id: 1 },
    };

    let collection = {};
    collection.find = sinon.stub().returns(collection);
    collection.project = sinon.stub().returns(collection);
    collection.sort = sinon.stub().returns(collection);
    collection.skip = sinon.stub().returns(collection);
    collection.limit = sinon.stub().returns(collection);
    collection.toArray = sinon.stub().returns([
      {
        id: 'id1',
        name: 'name',
        status: 'active',
        prop: 'prop1',
      },
    ]);

    // call
    let res = await DbOpsUtils.getAll({ ...config, collection }, filter, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.toArray.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: [
        {
          id: 'id1',
          name: 'name',
          status: 'active',
          prop: 'prop1',
        },
      ],
    });
  }).timeout(10000);

  /**
   * getAll exception
   */
  it('should getAll exception', async () => {
    let filter = {
      filter: {},
      projection: { _id: 0 },
      limit: 0,
      skip: 0,
      sort: { id: 1 },
    };

    let collection = {};
    collection.find = sinon.stub().throws('Test exception');

    // call
    let res = await DbOpsUtils.getAll({ ...config, collection }, filter, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message.toString()).to.include('Test exception');
  }).timeout(10000);

  /**
   * getAll exception no stack
   */
  it('should getAll exception no stack', async () => {
    let filter = {
      filter: {},
      projection: { _id: 0 },
      limit: 0,
      skip: 0,
      sort: { id: 1 },
    };

    let collection = {};
    collection.find = sinon.stub().callsFake(() => {
      throw 'Test exception';
    });

    // call
    let res = await DbOpsUtils.getAll({ ...config, collection }, filter, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message.toString()).to.include('Test exception');
  }).timeout(10000);
});
