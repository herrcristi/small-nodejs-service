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
      set: Joi.object().keys({
        name: Joi.string().min(1).max(64),
        description: Joi.string().min(0).max(1024).allow(null),
      }),
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
   * patch with success
   */
  it('should call patch with success', async () => {
    const patchInfo = {
      set: {
        name: 'name',
        description: 'description',
      },
    };

    // stub
    sinon.stub(DbOpsUtils, 'patch').callsFake((conf, objID, patch) => {
      return {
        status: 200,
        value: {
          id: objID,
          name: patch.set.name,
          type: undefined,
          status: undefined,
        },
      };
    });

    // call
    let res = await BaseServiceUtils.patch(config, 'id1', patchInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: 'id1',
        name: 'name',
        status: undefined,
        type: undefined,
      },
    });
  }).timeout(10000);

  /**
   * patch with failed validation
   */
  it('should call patch with failed validation', async () => {
    const patchInfo = {
      set: {
        name: 'name',
        prop: 'prop',
      },
    };

    // stub
    sinon.stub(DbOpsUtils, 'patch').callsFake((conf, objID, patch) => {
      return {
        status: 200,
        value: {
          id: objID,
          name: patch.set.name,
        },
      };
    });

    // call
    let res = await BaseServiceUtils.patch(config, 'id1', patchInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('"set.prop" is not allowed');
  }).timeout(10000);

  /**
   * patch with failed db
   */
  it('should call patch with failed db', async () => {
    const patchInfo = {
      set: {
        name: 'name',
      },
    };

    // stub
    sinon.stub(DbOpsUtils, 'patch').callsFake((conf, objID, obj) => {
      return { status: 500, error: { message: 'Test message error', error: new Error('Test error').toString() } };
    });

    // call
    let res = await BaseServiceUtils.patch(config, 'id1', patchInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message).to.include('Test message error');
  }).timeout(10000);
});