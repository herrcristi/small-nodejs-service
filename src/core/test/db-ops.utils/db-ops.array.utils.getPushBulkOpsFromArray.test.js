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
   * getPushBulkOpsFromArray simple array
   */
  it('should getPushBulkOpsFromArray simple array', async () => {
    let filter = { id: 'objid' };

    let addInfo = {
      schools: ['schoolid1'],
    };

    // call
    let bulkOps = DbOpsArrayUtils.getPushBulkOpsFromArray(filter, addInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $addToSet: { schools: { $each: ['schoolid1'] } },
          },
          arrayFilters: [],
        },
      },
    ]);
  }).timeout(10000);

  /**
   * getPushBulkOpsFromArray no array
   */
  it('should getPushBulkOpsFromArray no array', async () => {
    let filter = { id: 'objid' };

    let addInfo = {
      schools: 'schoolid1',
    };

    // call
    let bulkOps = DbOpsArrayUtils.getPushBulkOpsFromArray(filter, addInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([]);
  }).timeout(10000);

  /**
   * getPushBulkOpsFromArray schools roles1
   */
  it('should getPushBulkOpsFromArray schools roles1', async () => {
    let filter = { id: 'objid' };

    let addInfo = {
      schools: [
        {
          id: 'schoolid1',
        },
      ],
    };

    // call
    let bulkOps = DbOpsArrayUtils.getPushBulkOpsFromArray(filter, addInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([
      {
        updateMany: {
          filter: {
            $and: [
              { id: 'objid' },
              {
                schools: { $not: { $elemMatch: { id: 'schoolid1' } } },
              },
            ],
          },
          update: {
            $push: { schools: { id: 'schoolid1' } },
          },
          arrayFilters: [],
        },
      },
    ]);
  }).timeout(10000);

  /**
   * getPushBulkOpsFromArray schools roles2
   */
  it('should getPushBulkOpsFromArray schools roles2', async () => {
    let filter = { id: 'objid' };

    let addInfo = {
      schools: [
        {
          id: 'schoolid2',
          name: 'name2',
        },
      ],
    };

    // call
    let bulkOps = DbOpsArrayUtils.getPushBulkOpsFromArray(filter, addInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([
      {
        updateMany: {
          filter: {
            $and: [
              { id: 'objid' },
              {
                schools: { $not: { $elemMatch: { id: 'schoolid2' } } },
              },
            ],
          },
          update: {
            $push: {
              schools: {
                id: 'schoolid2',
                name: 'name2',
              },
            },
          },
          arrayFilters: [],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: { $set: { 'schools.$[schools].name': 'name2' } },
          arrayFilters: [{ 'schools.id': 'schoolid2' }],
        },
      },
    ]);
  }).timeout(10000);
  /**
   * getPushBulkOpsFromArray schools roles3
   */
  it('should getPushBulkOpsFromArray schools roles3', async () => {
    let filter = { id: 'objid' };

    let addInfo = {
      schools: [
        {
          id: 'schoolid3',
          name: 'name3',
          roles: ['role1', 'role2'],
        },
      ],
    };

    // call
    let bulkOps = DbOpsArrayUtils.getPushBulkOpsFromArray(filter, addInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([
      {
        updateMany: {
          filter: {
            $and: [
              { id: 'objid' },
              {
                schools: { $not: { $elemMatch: { id: 'schoolid3' } } },
              },
            ],
          },
          update: {
            $push: {
              schools: {
                id: 'schoolid3',
                name: 'name3',
                roles: ['role1', 'role2'],
              },
            },
          },
          arrayFilters: [],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: { $set: { 'schools.$[schools].name': 'name3' } },
          arrayFilters: [{ 'schools.id': 'schoolid3' }],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $addToSet: { 'schools.$[schools].roles': { $each: ['role1', 'role2'] } },
          },
          arrayFilters: [{ 'schools.id': 'schoolid3' }],
        },
      },
    ]);
  }).timeout(10000);

  /**
   * getPushBulkOpsFromArray more nested arrays1
   */
  it('should getPushBulkOpsFromArray more nested arrays1', async () => {
    let filter = { id: 'objid' };

    let addInfo = {
      schools: [
        {
          id: 'schoolid4',
          name: 'name4',
          principals: [
            {
              name: 'principal1',
            },
          ],
        },
      ],
    };

    // call
    let bulkOps = DbOpsArrayUtils.getPushBulkOpsFromArray(filter, addInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([
      {
        updateMany: {
          filter: {
            $and: [
              { id: 'objid' },
              {
                schools: { $not: { $elemMatch: { id: 'schoolid4' } } },
              },
            ],
          },
          update: {
            $push: {
              schools: {
                id: 'schoolid4',
                name: 'name4',
                principals: [{ name: 'principal1' }],
              },
            },
          },
          arrayFilters: [],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: { $set: { 'schools.$[schools].name': 'name4' } },
          arrayFilters: [{ 'schools.id': 'schoolid4' }],
        },
      },
      {
        updateMany: {
          filter: {
            $and: [
              { id: 'objid' },
              {
                schools: {
                  $elemMatch: {
                    id: 'schoolid4',
                    principals: { $not: { $elemMatch: { name: 'principal1' } } },
                  },
                },
              },
            ],
          },
          update: {
            $push: { 'schools.$[schools].principals': { name: 'principal1' } },
          },
          arrayFilters: [{ 'schools.id': 'schoolid4' }],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: { $set: { 'schools.$[schools].principals.$[principals].name': 'principal1' } },
          arrayFilters: [
            { 'schools.id': 'schoolid4' },
            {
              'principals.name': 'principal1',
            },
          ],
        },
      },
    ]);
  }).timeout(10000);

  /**
   * getPushBulkOpsFromArray more nested arrays
   */
  it('should getPushBulkOpsFromArray more nested arrays2', async () => {
    let filter = { id: 'objid' };

    let addInfo = {
      schools: [
        {
          id: 'schoolid4',
          building: [
            {
              id: 'b1',
              tags: ['t1', 't2'],
            },
            {
              id: 'b2',
            },
            {
              id: 'b3',
              addresses: [
                {
                  id: 'address1',
                },
              ],
            },
          ],
        },
      ],
    };

    // call
    let bulkOps = DbOpsArrayUtils.getPushBulkOpsFromArray(filter, addInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([
      {
        updateMany: {
          filter: {
            $and: [
              { id: 'objid' },
              {
                schools: { $not: { $elemMatch: { id: 'schoolid4' } } },
              },
            ],
          },
          update: {
            $push: {
              schools: {
                id: 'schoolid4',
                building: [
                  { id: 'b1', tags: ['t1', 't2'] },
                  {
                    id: 'b2',
                  },
                  {
                    id: 'b3',
                    addresses: [
                      {
                        id: 'address1',
                      },
                    ],
                  },
                ],
              },
            },
          },
          arrayFilters: [],
        },
      },
      {
        updateMany: {
          filter: {
            $and: [
              { id: 'objid' },
              {
                schools: {
                  $elemMatch: {
                    id: 'schoolid4',
                    building: { $not: { $elemMatch: { id: 'b1' } } },
                  },
                },
              },
            ],
          },
          update: {
            $push: { 'schools.$[schools].building': { id: 'b1', tags: ['t1', 't2'] } },
          },
          arrayFilters: [{ 'schools.id': 'schoolid4' }],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $addToSet: { 'schools.$[schools].building.$[building].tags': { $each: ['t1', 't2'] } },
          },
          arrayFilters: [
            { 'schools.id': 'schoolid4' },
            {
              'building.id': 'b1',
            },
          ],
        },
      },
      {
        updateMany: {
          filter: {
            $and: [
              { id: 'objid' },
              {
                schools: {
                  $elemMatch: {
                    id: 'schoolid4',
                    building: { $not: { $elemMatch: { id: 'b2' } } },
                  },
                },
              },
            ],
          },
          update: {
            $push: {
              'schools.$[schools].building': { id: 'b2' },
            },
          },
          arrayFilters: [{ 'schools.id': 'schoolid4' }],
        },
      },
      {
        updateMany: {
          filter: {
            $and: [
              { id: 'objid' },
              {
                schools: {
                  $elemMatch: {
                    id: 'schoolid4',
                    building: { $not: { $elemMatch: { id: 'b3' } } },
                  },
                },
              },
            ],
          },
          update: {
            $push: {
              'schools.$[schools].building': {
                id: 'b3',
                addresses: [{ id: 'address1' }],
              },
            },
          },
          arrayFilters: [{ 'schools.id': 'schoolid4' }],
        },
      },
      {
        updateMany: {
          filter: {
            $and: [
              { id: 'objid' },
              {
                schools: {
                  $elemMatch: {
                    id: 'schoolid4',
                    building: {
                      $elemMatch: {
                        id: 'b3',
                        addresses: { $not: { $elemMatch: { id: 'address1' } } },
                      },
                    },
                  },
                },
              },
            ],
          },
          update: {
            $push: {
              'schools.$[schools].building.$[building].addresses': { id: 'address1' },
            },
          },
          arrayFilters: [
            { 'schools.id': 'schoolid4' },
            {
              'building.id': 'b3',
            },
          ],
        },
      },
    ]);
  }).timeout(10000);

  /**
   * getPushBulkOpsFromArray more nested arrays
   */
  it('should getPushBulkOpsFromArray more nested arrays3', async () => {
    let filter = { id: 'objid' };

    let addInfo = {
      schools: [
        {
          id: 'schoolid4',
          name: 'name4',
          classes: [
            {
              tags: ['c1', 'c2'],
            },
          ],
        },
      ],
    };

    // call
    let bulkOps = DbOpsArrayUtils.getPushBulkOpsFromArray(filter, addInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([
      {
        updateMany: {
          filter: {
            $and: [
              { id: 'objid' },
              {
                schools: { $not: { $elemMatch: { id: 'schoolid4' } } },
              },
            ],
          },
          update: {
            $push: {
              schools: {
                id: 'schoolid4',
                name: 'name4',
                classes: [
                  {
                    tags: ['c1', 'c2'],
                  },
                ],
              },
            },
          },
          arrayFilters: [],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: { $set: { 'schools.$[schools].name': 'name4' } },
          arrayFilters: [{ 'schools.id': 'schoolid4' }],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $addToSet: { 'schools.$[schools].classes.$[].tags': { $each: ['c1', 'c2'] } },
          },
          arrayFilters: [{ 'schools.id': 'schoolid4' }],
        },
      },
    ]);
  }).timeout(10000);

  /**
   * getPushBulkOpsFromArray nested objects
   */
  it('should getPushBulkOpsFromArray nested objects', async () => {
    let filter = { id: 'objid' };

    let addInfo = {
      schools: [
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
    let bulkOps = DbOpsArrayUtils.getPushBulkOpsFromArray(filter, addInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(bulkOps, null, 2)}\n`);

    // check
    chai.expect(bulkOps).to.deep.equal([
      {
        updateMany: {
          filter: {
            $and: [
              { id: 'objid' },
              {
                schools: { $not: { $elemMatch: { id: 'schooldid5' } } },
              },
            ],
          },
          update: {
            $push: {
              schools: {
                id: 'schooldid5',
                address: {
                  street: 'str',
                  numbers: ['n1'],
                },
              },
            },
          },
          arrayFilters: [],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $set: { 'schools.$[schools].address.street': 'str' },
          },
          arrayFilters: [{ 'schools.id': 'schooldid5' }],
        },
      },
      {
        updateMany: {
          filter: { id: 'objid' },
          update: {
            $addToSet: { 'schools.$[schools].address.numbers': { $each: ['n1'] } },
          },
          arrayFilters: [{ 'schools.id': 'schooldid5' }],
        },
      },
    ]);
  }).timeout(10000);
});
