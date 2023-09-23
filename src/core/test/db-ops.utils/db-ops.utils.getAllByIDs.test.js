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
   * getAllByIDs success
   */
  it('should getAllByIDs with success', async () => {
    let ids = ['id1'];
    let projection = { _id: 0 };

    let collection = {};
    collection.find = sinon.stub().callsFake((filter) => {
      chai.expect(filter).to.deep.equal({ id: { $in: ['id1'] } });
      return collection;
    });
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
    let res = await DbOpsUtils.getAllByIDs({ ...config, collection }, ids, projection, _ctx);
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
});
