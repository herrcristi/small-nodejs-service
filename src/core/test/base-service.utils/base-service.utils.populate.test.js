const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const Joi = require('joi');

const BaseServiceUtils = require('../../utils/base-service.utils.js');
const DbOpsUtils = require('../../utils/db-ops.utils.js');

describe('Base Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  const config = {
    serviceName: 'service',
    schema: Joi.object().keys({
      name: Joi.string().min(1).max(64),
      description: Joi.string().min(0).max(1024).allow(null),
    }),
    collection: 'collection',
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * populate with success
   */
  it('should call populate with success', async () => {
    const objs = [
      {
        id: 'id1',
        name: 'name1',
        target: 'targetID1',
      },
      {
        id: 'id2',
        name: 'name2',
        target: {
          id: 'targetID2',
        },
      },
      {
        id: 'id3',
        name: 'name3',
        target: ['targetID3'],
      },
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
    ];

    let serviceRest = {
      getAllByIDs: sinon.stub().callsFake((ids, projection) => {
        console.log(
          `\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`
        );
        chai.expect(ids).to.deep.equal(['targetID1', 'targetID2', 'targetID3', 'targetID4']);
        chai.expect(projection).to.deep.equal({ id: 1, name: 1, type: 1, status: 1 });

        return {
          value: [
            { id: 'targetID1', name: 't1' },
            { id: 'targetID2', name: 't2' },
            { id: 'targetID3', name: 't3' },
            { id: 'targetID4', name: 't4' },
          ],
        };
      }),
    };

    // call
    let res = await BaseServiceUtils.populate(objs, 'target', serviceRest, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(serviceRest.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal([
      {
        id: 'id1',
        name: 'name1',
        target: {
          id: 'targetID1',
          name: 't1',
        },
      },
      {
        id: 'id2',
        name: 'name2',
        target: {
          id: 'targetID2',
          name: 't2',
        },
      },
      {
        id: 'id3',
        name: 'name3',
        target: [
          {
            id: 'targetID3',
            name: 't3',
          },
        ],
      },
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
            name: 't4',
          },
        ],
      },
    ]);
  }).timeout(10000);

  /**
   * populate with success - skipping empty
   */
  it('should call populate with success - skipping empty', async () => {
    const objs = [
      {
        id: 'id1',
        name: 'name1',
        target: [],
      },
    ];

    let serviceRest = {
      getAllByIDs: sinon.stub().callsFake((ids, projection) => {
        console.log(
          `\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`
        );
        chai.expect(ids).to.deep.equal([]);
        chai.expect(projection).to.deep.equal({ id: 1, name: 1 });

        return {
          value: [],
        };
      }),
    };

    // call
    let res = await BaseServiceUtils.populate(objs, 'target', serviceRest, _ctx, { id: 1, name: 1 });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(serviceRest.getAllByIDs.callCount).to.equal(0);
    chai.expect(res).to.deep.equal(objs);
  }).timeout(10000);

  /**
   * populate with success - skipping empty
   */
  it('should call populate with success - skipping empty', async () => {
    const objs = [
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
    ];

    let serviceRest = {
      getAllByIDs: sinon.stub().callsFake((ids, projection) => {
        console.log(
          `\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`
        );
        chai.expect(ids).to.deep.equal(['targetID4']);
        chai.expect(projection).to.deep.equal({ id: 1, name: 1 });

        return {
          error: { message: 'Test error message', error: new Error('Test error').toString() },
        };
      }),
    };

    // call
    let res = await BaseServiceUtils.populate(objs, 'target', serviceRest, _ctx, { id: 1, name: 1 });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(serviceRest.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * populate with success
   */
  it('should call populate with success', async () => {
    const objs = [
      {
        id: 'id1',
        name: 'name1',
        target: null,
      },
      {
        id: 'id2',
        name: 'name2',
        target: {
          // no id
        },
      },
      {
        id: 'id3',
        name: 'name3',
        target: ['targetID3'],
      },
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
      {
        id: 'id1',
        name: 'name1',
        target: 5, // number
      },
    ];

    let serviceRest = {
      getAllByIDs: sinon.stub().callsFake((ids, projection) => {
        console.log(
          `\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`
        );
        chai.expect(ids).to.deep.equal(['targetID3', 'targetID4']);
        chai.expect(projection).to.deep.equal({ id: 1, name: 1, type: 1, status: 1 });

        return {
          value: [
            //  nothing is found
          ],
        };
      }),
    };

    // call
    let res = await BaseServiceUtils.populate(objs, 'target', serviceRest, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(serviceRest.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal([
      {
        id: 'id1',
        name: 'name1',
        target: null,
      },
      {
        id: 'id2',
        name: 'name2',
        target: {},
      },
      {
        id: 'id3',
        name: 'name3',
        target: ['targetID3'],
      },
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
      {
        id: 'id1',
        name: 'name1',
        target: 5,
      },
    ]);
  }).timeout(10000);
});
