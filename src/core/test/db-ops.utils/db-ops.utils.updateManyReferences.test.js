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
   * updateManyReferences success array
   */
  it('should updateManyReferences with success array', async () => {
    const ref = {
      fieldName: 'schools[]',
    };

    let objInfo = {
      id: 'id1',
      name: 'name',
    };

    let collection = {};
    collection.updateMany = sinon.stub().callsFake((filter, op, options) => {
      console.log(`\nCurrent updateMany ${JSON.stringify({ filter, op, options }, null, 2)}`);

      chai.expect(filter).to.deep.equal({
        'schools.id': 'id1',
      });
      chai.expect(op).to.deep.equal({
        $set: {
          'schools.$[schools].id': 'id1',
          'schools.$[schools].name': 'name',
          lastModifiedTimestamp: op.$set.lastModifiedTimestamp,
        },
        $inc: {
          modifiedCount: 1,
        },
      });
      chai.expect(options).to.deep.equal({
        arrayFilters: [
          {
            'schools.id': 'id1',
          },
        ],
      });

      return {
        modifiedCount: 1,
      };
    });

    // call
    let res = await DbOpsUtils.updateManyReferences({ ...config, collection }, ref, objInfo, _ctx);
    console.error(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.updateMany.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: 1,
    });
  }).timeout(10000);

  /**
   * updateManyReferences success non array
   */
  it('should updateManyReferences with success non array', async () => {
    const ref = {
      fieldName: 'user',
    };

    let objInfo = {
      id: 'id1',
      name: 'name',
    };

    let collection = {};
    collection.updateMany = sinon.stub().callsFake((filter, op, options) => {
      console.log(`\nCurrent updateMany ${JSON.stringify({ filter, op, options }, null, 2)}`);

      chai.expect(filter).to.deep.equal({
        'user.id': 'id1',
      });

      chai.expect(op).to.deep.equal({
        $set: {
          'user.id': 'id1',
          'user.name': 'name',
          lastModifiedTimestamp: op.$set.lastModifiedTimestamp,
        },
        $inc: {
          modifiedCount: 1,
        },
      });

      chai.expect(options).to.deep.equal({
        arrayFilters: [],
      });

      return {
        modifiedCount: 1,
      };
    });

    // call
    let res = await DbOpsUtils.updateManyReferences({ ...config, collection }, ref, objInfo, _ctx);
    console.error(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.updateMany.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: 1,
    });
  }).timeout(10000);

  /**
   * updateManyReferences success array with array
   */
  it('should updateManyReferences with success array with array', async () => {
    const ref = {
      fieldName: 'schools[].locations[]',
    };

    let objInfo = {
      id: 'id1',
      name: 'name',
    };

    let collection = {};
    collection.updateMany = sinon.stub().callsFake((filter, op, options) => {
      console.log(`\nCurrent updateMany ${JSON.stringify({ filter, op, options }, null, 2)}`);

      chai.expect(filter).to.deep.equal({
        'schools.locations.id': 'id1',
      });
      chai.expect(op).to.deep.equal({
        $set: {
          'schools.$[schools].locations.$[locations].id': 'id1',
          'schools.$[schools].locations.$[locations].name': 'name',
          lastModifiedTimestamp: op.$set.lastModifiedTimestamp,
        },
        $inc: {
          modifiedCount: 1,
        },
      });
      chai.expect(options).to.deep.equal({
        arrayFilters: [
          {
            'schools.locations.id': 'id1',
          },
          {
            'locations.id': 'id1',
          },
        ],
      });

      return {
        modifiedCount: 1,
      };
    });

    // call
    let res = await DbOpsUtils.updateManyReferences({ ...config, collection }, ref, objInfo, _ctx);
    console.error(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.updateMany.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: 1,
    });
  }).timeout(10000);

  /**
   * updateManyReferences success array with non-array
   */
  it('should updateManyReferences with success array with non-array', async () => {
    const ref = {
      fieldName: 'schools[].location',
    };

    let objInfo = {
      id: 'id1',
      name: 'name',
    };

    let collection = {};
    collection.updateMany = sinon.stub().callsFake((filter, op, options) => {
      console.log(`\nCurrent updateMany ${JSON.stringify({ filter, op, options }, null, 2)}`);

      chai.expect(filter).to.deep.equal({
        'schools.location.id': 'id1',
      });
      chai.expect(op).to.deep.equal({
        $set: {
          'schools.$[schools].location.id': 'id1',
          'schools.$[schools].location.name': 'name',
          lastModifiedTimestamp: op.$set.lastModifiedTimestamp,
        },
        $inc: {
          modifiedCount: 1,
        },
      });
      chai.expect(options).to.deep.equal({
        arrayFilters: [
          {
            'schools.location.id': 'id1',
          },
        ],
      });

      return {
        modifiedCount: 1,
      };
    });

    // call
    let res = await DbOpsUtils.updateManyReferences({ ...config, collection }, ref, objInfo, _ctx);
    console.error(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(collection.updateMany.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: 1,
    });
  }).timeout(10000);

  /**
   * updateManyReferences exception
   */
  it('should updateManyReferences exception', async () => {
    const ref = {
      fieldName: 'schools[]',
    };

    let objInfo = {
      id: 'id1',
      name: 'name',
    };

    let collection = {};
    collection.updateMany = sinon.stub().throws('Test exception');

    // call
    let res = await DbOpsUtils.updateManyReferences({ ...config, collection }, ref, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message.toString()).to.include('Test exception');
  }).timeout(10000);
});
