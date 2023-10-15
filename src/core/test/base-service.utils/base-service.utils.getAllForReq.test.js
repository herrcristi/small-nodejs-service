const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const Joi = require('joi');

const BaseServiceUtils = require('../../utils/base-service.utils.js');
const DbOpsUtils = require('../../utils/db-ops.utils.js');
const RestApiUtils = require('../../utils/rest-api.utils.js');

describe('Base Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  const config = {
    serviceName: 'service',
    schema: Joi.object().keys({
      name: Joi.string().min(1).max(64),
      description: Joi.string().min(0).max(1024).allow(null),
    }),
    collection: 'collection',
    references: [{ fieldName: 'field', service: { getAllByIDs: () => {} }, projection: null /*default*/ }],
    fillReferences: false,
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllForReq with success
   */
  it('should call getAllForReq with success', async () => {
    // stub
    sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: {
        filter: {},
        projection: { _id: 0 },
        limit: 0,
        skip: 0,
      },
    });

    sinon.stub(DbOpsUtils, 'getAll').returns({
      status: 200,
      value: [{ id: 'id1', field: 'idf1' }],
    });

    sinon.stub(DbOpsUtils, 'getAllCount').returns({
      status: 200,
      value: 1,
    });

    config.fillReferences = true;
    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake(() => {
      return {
        value: [
          {
            id: 'idf1',
            name: 'name1',
          },
        ],
      };
    });

    // call
    let res = await BaseServiceUtils.getAllForReq(config, { query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        data: [
          {
            id: 'id1',
            field: {
              id: 'idf1',
              name: 'name1',
            },
          },
        ],
        meta: {
          count: 1,
          limit: 0,
          skip: 0,
          sort: undefined,
        },
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq partial with success
   */
  it('should call getAllForReq partial with success', async () => {
    // stub
    sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: {
        filter: {},
        projection: { _id: 0 },
        limit: 1,
        skip: 0,
        sort: { id: 1 },
      },
    });

    sinon.stub(DbOpsUtils, 'getAll').returns({
      status: 200,
      value: [{ id: 'id1' }],
    });

    sinon.stub(DbOpsUtils, 'getAllCount').returns({
      status: 200,
      value: 2,
    });

    // call
    let res = await BaseServiceUtils.getAllForReq(config, { query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 206,
      value: {
        data: [
          {
            id: 'id1',
          },
        ],
        meta: {
          count: 2,
          limit: 1,
          skip: 0,
          sort: { id: 1 },
        },
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq fail due to invalid req query
   */
  it('should call getAllForReq fail due to invalid req query', async () => {
    // stub
    sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 400,
      error: { message: 'Test error message', error: new Error('Test error').toString() },
    });

    sinon.stub(DbOpsUtils, 'getAll').returns({
      status: 200,
      value: [{ id: 'id1' }],
    });

    sinon.stub(DbOpsUtils, 'getAllCount').returns({
      status: 200,
      value: 1,
    });

    // call
    let res = await BaseServiceUtils.getAllForReq(config, { query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq fail getAll
   */
  it('should call getAllForReq and fail getAll', async () => {
    // stub
    sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: {
        filter: {},
        projection: { _id: 0 },
        limit: 0,
        skip: 0,
      },
    });

    sinon.stub(DbOpsUtils, 'getAll').returns({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error').toString() },
    });

    sinon.stub(DbOpsUtils, 'getAllCount').returns({
      status: 200,
      value: 1,
    });

    // call
    let res = await BaseServiceUtils.getAllForReq(config, { query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq fail getAllCount
   */
  it('should call getAllForReq and fail getAllCount', async () => {
    // stub
    sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: {
        filter: {},
        projection: { _id: 0 },
        limit: 0,
        skip: 0,
      },
    });

    sinon.stub(DbOpsUtils, 'getAll').returns({
      status: 200,
      value: [{ id: 'id1' }],
    });

    sinon.stub(DbOpsUtils, 'getAllCount').returns({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error').toString() },
    });

    // call
    let res = await BaseServiceUtils.getAllForReq(config, { query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);
});
