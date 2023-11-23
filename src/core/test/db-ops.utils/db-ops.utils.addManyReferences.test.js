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
   * addManyReferences success array
   */
  it('should addManyReferences with success array', async () => {
    const ref = {
      fieldName: 'schools',
      isArray: true,
    };

    let objInfo = {
      id: 'id1',
      name: 'name',
    };

    let collection = {};
    collection.updateMany = sinon.stub().callsFake((filter, op) => {
      console.log(`Current filter ${JSON.stringify(filter, null, 2)}`);
      console.log(`Current op ${JSON.stringify(op, null, 2)}`);

      chai.expect(filter).to.deep.equal({
        id: { $in: ['targetID'] },
        'schools.id': { $nin: ['id1'] },
      });

      chai.expect(op).to.deep.equal({
        $push: {
          schools: {
            id: 'id1',
            name: 'name',
          },
        },
        $set: {
          lastModifiedTimestamp: op.$set.lastModifiedTimestamp,
        },
        $inc: {
          modifiedCount: 1,
        },
      });

      return {
        modifiedCount: 1,
      };
    });

    // call
    let res = await DbOpsUtils.addManyReferences({ ...config, collection }, ['targetID'], ref, objInfo, _ctx);
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
   * addManyReferences success non array
   */
  it('should addManyReferences with success non array', async () => {
    const ref = {
      fieldName: 'user',
      isArray: false,
    };

    let objInfo = {
      id: 'id1',
      name: 'name',
    };

    let collection = {};
    collection.updateMany = sinon.stub().callsFake((filter, op) => {
      console.log(`Current filter ${JSON.stringify(filter, null, 2)}`);
      console.log(`Current op ${JSON.stringify(op, null, 2)}`);

      chai.expect(filter).to.deep.equal({
        id: { $in: ['targetID'] },
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

      return {
        modifiedCount: 1,
      };
    });

    // call
    let res = await DbOpsUtils.addManyReferences({ ...config, collection }, ['targetID'], ref, objInfo, _ctx);
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
   * addManyReferences exception
   */
  it('should addManyReferences exception', async () => {
    const ref = {
      fieldName: 'schools',
      isArray: true,
    };

    let objInfo = {
      id: 'id1',
      name: 'name',
    };

    let collection = {};
    collection.updateMany = sinon.stub().throws('Test exception');

    // call
    let res = await DbOpsUtils.addManyReferences({ ...config, collection }, ['targetID'], ref, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    delete res.time;

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message.toString()).to.include('Test exception');
  }).timeout(10000);
});
