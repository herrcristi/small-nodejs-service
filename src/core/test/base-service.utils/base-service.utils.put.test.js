const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');
const RestMessagesUtils = require('../../utils/rest-messages.utils.js');
const BaseControllerUtils = require('../../utils/base-controller.utils.js');
const RestApiUtils = require('../../utils/rest-api.utils.js');

describe('Rest Messages Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  let res = {};

  let next = () => {};

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * put with success
   */
  it('should call put with success', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
      params: { id: 'id1' },
      body: {
        name: 'name',
      },
    };

    // stub
    let controller = {
      name: 'Service',
      schema: {
        validate: () => {
          return {};
        },
      },
      service: {
        put: sinon.stub().callsFake((objID, objInfo) => {
          return {
            value: {
              id: objID,
              name: objInfo.name,
              type: 'type',
              status: 'status',
            },
          };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.put(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.put.callCount).to.equal(1);

    chai.expect(response).to.deep.equal({
      status: 200,
      value: {
        id: 'id1',
        name: 'name',
        type: 'type',
        status: 'status',
      },
    });
  }).timeout(10000);

  /**
   * fail to put due to invalid request
   */
  it('should fail to put due to invalid request', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
      params: { id: 'id1' },
      body: {
        name: 'name',
      },
    };

    // stub
    let controller = {
      name: 'Service',
      schema: {
        validate: () => {
          return {
            error: {
              details: [{ message: 'Test error message' }],
            },
          };
        },
      },
      service: {
        put: sinon.stub().callsFake((objID, objInfo) => {
          return {
            value: {
              id: objID,
              name: objInfo.name,
              type: 'type',
              status: 'status',
            },
          };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.put(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.put.callCount).to.equal(0);

    chai.expect(response).to.deep.equal({
      status: 400,
      error: {
        message: 'Test error message',
      },
    });
  }).timeout(10000);

  /**
   * fail put
   */
  it('should fail to put', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
      params: { id: 'id1' },
      body: {
        name: 'name',
      },
    };

    // stub
    let controller = {
      name: 'Service',
      schema: {
        validate: () => {
          return {};
        },
      },
      service: {
        put: sinon.stub().callsFake((objID, objInfo) => {
          return { error: { message: 'Test error message', error: new Error('Test error').toString() } };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.put(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.put.callCount).to.equal(1);

    chai.expect(response).to.deep.equal({
      status: 500,
      error: 'Error: Test error',
    });
  }).timeout(10000);

  /**
   * fail put not found
   */
  it('should fail to put - not found', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
      params: { id: 'id1' },
      body: {
        name: 'name',
      },
    };

    // stub
    let controller = {
      name: 'Service',
      schema: {
        validate: () => {
          return {};
        },
      },
      service: {
        put: sinon.stub().callsFake((objID, objInfo) => {
          return { value: null };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.put(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.put.callCount).to.equal(1);

    chai.expect(response).to.deep.equal({
      status: 404,
      error: 'id1',
    });
  }).timeout(10000);
});
