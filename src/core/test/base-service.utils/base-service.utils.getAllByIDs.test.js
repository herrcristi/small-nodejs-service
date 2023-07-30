const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const BaseServiceUtils = require('../../utils/base-service.utils.js');
const DbOpsUtils = require('../../utils/db-ops.utils.js');

describe('Base Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  const config = {
    serviceName: 'service',
    schema: 'schema',
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
   * getAllByIDs with success
   */
  it('should call getAllByIDs with success', async () => {
    // stub
    sinon.stub(DbOpsUtils, 'getAllByIDs').returns({
      status: 200,
      value: [{ id: 'id1', field: 'idf1' }],
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
    let res = await BaseServiceUtils.getAllByIDs(config, ['id1'], { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: [
        {
          id: 'id1',
          field: {
            id: 'idf1',
            name: 'name1',
          },
        },
      ],
    });
  }).timeout(10000);

  /**
   * getAllByIDs fail
   */
  it('should call getAllByIDs and fail', async () => {
    let filter = { filter: {} };

    // stub
    sinon.stub(DbOpsUtils, 'getAllByIDs').returns({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error').toString() },
    });

    // call
    let res = await BaseServiceUtils.getAllByIDs(config, ['id1'], { id: 1 }, _ctx);
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
   * getAllByIDs references fail
   */
  it('should call getAllByIDs and references fail', async () => {
    let filter = { filter: {} };

    // stub
    sinon.stub(DbOpsUtils, 'getAllByIDs').returns({
      status: 200,
      value: [{ id: 'id1', field: 'idf1' }],
    });

    config.fillReferences = true;
    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake(() => {
      return {
        status: 400,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await BaseServiceUtils.getAllByIDs(config, ['id1'], { id: 1 }, _ctx);
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
});
