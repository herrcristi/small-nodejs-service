const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');

const DbOpsUtils = require('../../utils/db-ops.array.utils.js');

describe('DB-Ops Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getPullBulkOpsFromArray simple array
   */
  it('should getPullBulkOpsFromArray simple array', async () => {
    let filter = { id: 'objid' };

    let removeInfo = {
      schools: ['schoolid1'],
    };

    // call
    let bulkOps = DbOpsUtils.getPullBulkOpsFromArray(filter, removeInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: {
              schools: { $in: ['schoolid1'] },
            },
          },
        },
      },
    ]);
  }).timeout(10000);

  /**
   * getPullBulkOpsFromArray
   */
  it('should getPullBulkOpsFromArray', async () => {
    let filter = { id: 'objid' };

    let removeInfo = {
      schools: [
        {
          id: 'schoolid1',
        },
        {
          id: 'schoolid2',
          name: 'name2',
        },
        {
          id: 'schooldid3',
          roles: ['role1', 'role2'],
        },
        {
          id: 'schooldid4',
          name: 'name4',
          roles: ['role3', 'role4'],
          principals: [
            {
              name: 'principal1',
            },
          ],
          building: [
            {
              id: 'b1',
              tags: ['t1', 't2'],
            },
            {
              id: 'b2',
            },
          ],
          classes: [
            {
              tags: ['c1', 'c2'],
            },
          ],
        },
        {
          id: 'schooldid5',
          address: {
            street: 'str',
            numbers: ['n1'],
          },
        },
      ],
    };

    // call
    let bulkOps = DbOpsUtils.getPullBulkOpsFromArray(filter, removeInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: {
              schools: { id: 'schoolid1' },
            },
          },
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: {
              schools: {
                id: 'schoolid2',
                name: 'name2',
              },
            },
          },
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: {
              'schools.$[schools].roles': { $in: ['role1', 'role2'] },
            },
          },
          arrayFilters: [{ 'schools.id': 'schooldid3' }],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: {
              'schools.$[schools].roles': { $in: ['role3', 'role4'] },
            },
          },
          arrayFilters: [
            {
              'schools.id': 'schooldid4',
              'schools.name': 'name4',
            },
          ],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: {
              'schools.$[schools].principals': { name: 'principal1' },
            },
          },
          arrayFilters: [
            {
              'schools.id': 'schooldid4',
              'schools.name': 'name4',
            },
          ],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: {
              'schools.$[schools].building.$[building].tags': { $in: ['t1', 't2'] },
            },
          },
          arrayFilters: [
            {
              'schools.id': 'schooldid4',
              'schools.name': 'name4',
            },
            {
              'building.id': 'b1',
            },
          ],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: {
              'schools.$[schools].building': { id: 'b2' },
            },
          },
          arrayFilters: [
            {
              'schools.id': 'schooldid4',
              'schools.name': 'name4',
            },
          ],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: {
              'schools.$[schools].classes.$[].tags': { $in: ['c1', 'c2'] },
            },
          },
          arrayFilters: [
            {
              'schools.id': 'schooldid4',
              'schools.name': 'name4',
            },
          ],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: {
              'schools.$[schools].address.numbers': { $in: ['n1'] },
            },
          },
          arrayFilters: [
            {
              'schools.id': 'schooldid5',
              'schools.address.street': 'str',
            },
          ],
        },
      },
    ]);
  }).timeout(10000);
});
