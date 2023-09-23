const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');

const DbOpsArrayUtils = require('../../utils/db-ops.array.utils.js');

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
    let bulkOps = DbOpsArrayUtils.getPullBulkOpsFromArray(filter, removeInfo, _ctx);
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
          arrayFilters: [],
        },
      },
    ]);
  }).timeout(10000);

  /**
   * getPullBulkOpsFromArray no array
   */
  it('should getPullBulkOpsFromArray no array', async () => {
    let filter = { id: 'objid' };

    let removeInfo = {
      schools: 'schoolid1',
    };

    // call
    let bulkOps = DbOpsArrayUtils.getPullBulkOpsFromArray(filter, removeInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([]);
  }).timeout(10000);

  /**
   * getPullBulkOpsFromArray schools roles
   */
  it('should getPullBulkOpsFromArray schools roles', async () => {
    let filter = { id: 'objid' };

    let removeInfo = {
      schools: [
        {
          id: 'schoolid1',
        },
        {
          id: 'schoolid2',
          name: 'name2', // this will be ignored because id exists
        },
        {
          name: 'name2', // this will be taken into consideration
        },
        {
          id: 'schooldid3',
          roles: ['role1', 'role2'],
        },
      ],
    };

    // call
    let bulkOps = DbOpsArrayUtils.getPullBulkOpsFromArray(filter, removeInfo, _ctx);
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
          arrayFilters: [],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: { schools: { id: 'schoolid2' } },
          },
          arrayFilters: [],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: { schools: { name: 'name2' } },
          },
          arrayFilters: [],
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
    ]);
  }).timeout(10000);

  /**
   * getPullBulkOpsFromArray more nested arrays
   */
  it('should getPullBulkOpsFromArray more nested arrays', async () => {
    let filter = { id: 'objid' };

    let removeInfo = {
      schools: [
        {
          id: 'schooldid4',
          name: 'name4', // this will be ignored because id exists
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
      ],
    };

    // call
    let bulkOps = DbOpsArrayUtils.getPullBulkOpsFromArray(filter, removeInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: { 'schools.$[schools].roles': { $in: ['role3', 'role4'] } },
          },
          arrayFilters: [{ 'schools.id': 'schooldid4' }],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: { 'schools.$[schools].principals': { name: 'principal1' } },
          },
          arrayFilters: [{ 'schools.id': 'schooldid4' }],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: { 'schools.$[schools].building.$[building].tags': { $in: ['t1', 't2'] } },
          },
          arrayFilters: [
            {
              'schools.id': 'schooldid4',
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
            $pull: { 'schools.$[schools].building': { id: 'b2' } },
          },
          arrayFilters: [{ 'schools.id': 'schooldid4' }],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: { 'schools.$[schools].classes.$[].tags': { $in: ['c1', 'c2'] } },
          },
          arrayFilters: [{ 'schools.id': 'schooldid4' }],
        },
      },
    ]);
  }).timeout(10000);

  /**
   * getPullBulkOpsFromArray nested objects
   */
  it('should getPullBulkOpsFromArray nested objects', async () => {
    let filter = { id: 'objid' };

    let removeInfo = {
      schools: [
        {
          id: 'schooldid5',
          address: {
            street: 'str', // this will be ignored because id exists
            numbers: ['n1'],
          },
        },
        {
          address: {
            street: 'str', // this will matter
            numbers: ['n1'],
          },
        },
      ],
    };

    // call
    let bulkOps = DbOpsArrayUtils.getPullBulkOpsFromArray(filter, removeInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: { 'schools.$[schools].address.numbers': { $in: ['n1'] } },
          },
          arrayFilters: [{ 'schools.id': 'schooldid5' }],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $pull: { 'schools.$[schools].address.numbers': { $in: ['n1'] } },
          },
          arrayFilters: [{ 'schools.address.street': 'str' }],
        },
      },
    ]);
  }).timeout(10000);
});
