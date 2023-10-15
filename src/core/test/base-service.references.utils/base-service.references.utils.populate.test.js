const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const Joi = require('joi');

const ReferencesUtils = require('../../utils/base-service.references.utils.js');
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
    references: [{ fieldName: 'target', service: { getAllByIDs: () => {} }, projection: null /*default*/ }],
    fillReferences: false,
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

    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal(['targetID1', 'targetID2', 'targetID3', 'targetID4']);
      chai.expect(projection).to.deep.equal({ _id: 0, id: 1, name: 1, type: 1, status: 1 });

      return {
        status: 200,
        value: [
          { id: 'targetID1', name: 't1' },
          { id: 'targetID2', name: 't2' },
          { id: 'targetID3', name: 't3' },
          { id: 'targetID4', name: 't4' },
        ],
      };
    });

    // call
    let res = await ReferencesUtils.populate(config.references[0], objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(config.references[0].service.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: [
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
      ],
    });
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

    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal([]);
      chai.expect(projection).to.deep.equal({ id: 1, name: 1 });

      return {
        status: 200,
        value: [],
      };
    });

    // call
    let res = await ReferencesUtils.populate(config.references[0], objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(config.references[0].service.getAllByIDs.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: objs,
    });
  }).timeout(10000);

  /**
   * populate fail
   */
  it('should call populate and fail', async () => {
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

    let refConfig = _.cloneDeep(config.references[0]);
    refConfig.projection = { id: 1, name: 1 };

    sinon.stub(refConfig.service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal(['targetID4']);
      chai.expect(projection).to.deep.equal({ _id: 0, id: 1, name: 1 });

      return {
        status: 500,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await ReferencesUtils.populate(refConfig, objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(refConfig.service.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * populate with success skipping null and not all found
   */
  it('should call populate with success skipping null and not all found', async () => {
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

    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal(['targetID3', 'targetID4']);
      chai.expect(projection).to.deep.equal({ _id: 0, id: 1, name: 1, type: 1, status: 1 });

      return {
        status: 200,
        value: [
          //  nothing is found
        ],
      };
    });

    // call
    let res = await ReferencesUtils.populate(config.references[0], objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(config.references[0].service.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: [
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
      ],
    });
  }).timeout(10000);
});
