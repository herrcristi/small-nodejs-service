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
      field: Joi.string().min(0).max(1024).allow(null),
    }),
    collection: 'collection',
    references: [{ fieldName: 'field', service: { getAllByIDs: () => {} }, projection: null /*default*/ }],
    fillReferences: false,
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    delete config.events;
    sinon.restore();
  });

  after(async function () {});

  /**
   * put with success
   */
  it('should call put with success', async () => {
    const objInfo = {
      name: 'name',
      field: 'idf1',
    };

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

    // stub
    sinon.stub(DbOpsUtils, 'put').callsFake((conf, objID, obj) => {
      console.log(`\nDbOpsUtils.put called with objid ${objID} and obj ${JSON.stringify(obj, null, 2)}\n`);
      chai.expect(obj).to.deep.equal({
        name: 'name',
        field: {
          id: 'idf1',
          name: 'name1',
        },
      });

      return {
        status: 200,
        value: {
          id: objID,
          name: obj.name,
          type: undefined,
          status: undefined,
        },
      };
    });

    config.events = {
      service: {
        post: sinon.stub().callsFake((event) => {
          console.log(`\nEvents called with ${JSON.stringify(event, null, 2)}\n`);
        }),
      },
    };

    // call
    let res = await BaseServiceUtils.put(config, 'id1', objInfo, _ctx);
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
    chai.expect(config.events.service.post.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * put with success with no events
   */
  it('should call put with success no events', async () => {
    const objInfo = {
      name: 'name',
      field: 'idf1',
    };

    config.fillReferences = true;
    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake(() => {
      return {
        value: [{ id: 'idf1', name: 'name1' }],
      };
    });

    // stub
    sinon.stub(DbOpsUtils, 'put').callsFake((conf, objID, obj) => {
      console.log(`\nDbOpsUtils.put called with objid ${objID} and obj ${JSON.stringify(obj, null, 2)}\n`);
      chai.expect(obj).to.deep.equal({
        name: 'name',
        field: { id: 'idf1', name: 'name1' },
      });

      return {
        status: 200,
        value: {
          id: objID,
          name: obj.name,
          type: undefined,
          status: undefined,
        },
      };
    });

    // call
    let res = await BaseServiceUtils.put(config, 'id1', objInfo, _ctx);
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
   * put with failed validation
   */
  it('should call put with failed validation', async () => {
    const objInfo = {
      name: 'name',
      prop: 'prop',
    };

    // stub
    sinon.stub(DbOpsUtils, 'put').callsFake((conf, objID, obj) => {
      return {
        status: 200,
        value: {
          id: objID,
          ...obj,
        },
      };
    });

    // call
    let res = await BaseServiceUtils.put(config, 'id1', objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('"prop" is not allowed');
  }).timeout(10000);

  /**
   * put with failed db
   */
  it('should call put with failed db', async () => {
    const objInfo = {
      name: 'name',
    };

    // stub
    sinon.stub(DbOpsUtils, 'put').callsFake((conf, objID, obj) => {
      return { status: 500, error: { message: 'Test message error', error: new Error('Test error').toString() } };
    });

    // call
    let res = await BaseServiceUtils.put(config, 'id1', objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message).to.include('Test message error');
  }).timeout(10000);

  /**
   * put with references fail
   */
  it('should call put with references fail', async () => {
    const objInfo = {
      name: 'name',
      field: 'idf1',
    };

    config.fillReferences = true;
    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake(() => {
      return {
        status: 400,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // stub
    sinon.stub(DbOpsUtils, 'put').callsFake((conf, objID, obj) => {
      console.log(`\nDbOpsUtils.put called with objid ${objID} and obj ${JSON.stringify(obj, null, 2)}\n`);

      return {
        status: 200,
        value: {
          id: objID,
          name: obj.name,
          type: undefined,
          status: undefined,
        },
      };
    });

    // call
    let res = await BaseServiceUtils.put(config, 'id1', objInfo, _ctx);
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
