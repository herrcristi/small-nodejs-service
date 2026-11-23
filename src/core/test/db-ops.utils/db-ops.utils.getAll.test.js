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
   * no connection of the pool is free in time (the database is busy): 503, the request can be sent again later (it
   * does not wait for ever), without the text of the driver
   */
  it('should getAll answer 503 when no database connection is free in time', async () => {
    // stub: the database fails, as the driver does when the wait for a connection of the pool ends
    const waitError = new Error('Timed out while checking out a connection from connection pool: localhost:27017');
    Object.defineProperty(waitError, 'name', { value: 'MongoWaitQueueTimeoutError' });
    const collection = {};
    collection.find = sinon.stub().throws(waitError);

    // call
    const res = await DbOpsUtils.getAll({ ...config, collection }, { filter: {}, projection: { _id: 0 } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(503);
    chai.expect(res.error.message).to.equal('No free database connection in time');
  }).timeout(10000);

  /**
   * a call stopped by the database after its time limit (maxTimeMS, MaxTimeMSExpired): 503, the request can be sent
   * again later, without the text of the database; the call carried the time limit (30 s by default)
   */
  it('should getAll answer 503 when the database call runs longer than its time limit', async () => {
    // stub: the database stops the call, as it does after its maxTimeMS
    const timeError = new Error('Executor error during find command :: caused by :: operation exceeded time limit');
    timeError.code = 50;
    const collection = {};
    collection.find = sinon.stub().throws(timeError);

    // call
    const res = await DbOpsUtils.getAll({ ...config, collection }, { filter: {}, projection: { _id: 0 } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(503);
    chai.expect(res.error.message).to.equal('The database call ran longer than its time limit');
    chai.expect(collection.find.firstCall.args[1]).to.deep.equal({ maxTimeMS: 30000 });
  }).timeout(10000);

  /**
   * getAll exception string
   */
  it('should getAll exception string', async () => {
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
