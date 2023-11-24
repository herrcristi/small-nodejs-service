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
    fillReferences: true,
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * populateReferences with success
   */
  it('should call populateReferences with success', async () => {
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

    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal(['targetID4']);
      chai.expect(projection).to.deep.equal({ _id: 0, id: 1, name: 1, type: 1, status: 1 });

      return {
        status: 200,
        value: [{ id: 'targetID4', name: 't4' }],
      };
    });

    // call

    let res = await ReferencesUtils.populateReferences(config, objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    console.log(`\nObjs returned: ${JSON.stringify(objs, null, 2)}\n`);

    // check
    chai.expect(config.references[0].service.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
    chai.expect(objs).to.deep.equal([
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
   * populateReferences with skipping
   */
  it('should call populateReferences with skipping', async () => {
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

    const refConfig = _.cloneDeep(config);
    refConfig.fillReferences = false;

    sinon.stub(refConfig.references[0].service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal(['targetID4']);
      chai.expect(projection).to.deep.equal({ _id: 0, id: 1, name: 1, type: 1, status: 1 });

      return {
        status: 200,
        value: [{ id: 'targetID4', name: 't4' }],
      };
    });

    // call

    let res = await ReferencesUtils.populateReferences(refConfig, objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    console.log(`\nObjs returned: ${JSON.stringify(objs, null, 2)}\n`);

    // check
    chai.expect(refConfig.references[0].service.getAllByIDs.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: null,
    });
    chai.expect(objs).to.deep.equal([
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
    ]);
  }).timeout(10000);

  /**
   * populateReferences with no objects
   */
  it('should call populateReferences with no objects', async () => {
    const objs = null;

    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);

      return {
        status: 200,
        value: [{ id: 'targetID4', name: 't4' }],
      };
    });

    // call
    let res = await ReferencesUtils.populateReferences(config, objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(config.references[0].service.getAllByIDs.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: null,
    });
  }).timeout(10000);

  /**
   * populateReferences with object not array
   */
  it('should call populateReferences with object not array', async () => {
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

    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal(['targetID4']);
      chai.expect(projection).to.deep.equal({ _id: 0, id: 1, name: 1, type: 1, status: 1 });

      return {
        status: 200,
        value: [{ id: 'targetID4', name: 't4' }],
      };
    });

    // call

    let res = await ReferencesUtils.populateReferences(config, objs[0] /*simple object*/, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    console.log(`\nObjs returned: ${JSON.stringify(objs, null, 2)}\n`);

    // check
    chai.expect(config.references[0].service.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
    chai.expect(objs).to.deep.equal([
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
   * populateReferences fail
   */
  it('should call populateReferences and fail', async () => {
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

    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal(['targetID4']);
      chai.expect(projection).to.deep.equal({ _id: 0, id: 1, name: 1, type: 1, status: 1 });

      return {
        status: 500,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call

    let res = await ReferencesUtils.populateReferences(config, objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    console.log(`\nObjs returned: ${JSON.stringify(objs, null, 2)}\n`);

    // check
    chai.expect(config.references[0].service.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
    chai.expect(objs).to.deep.equal([
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
    ]);
  }).timeout(10000);
});
