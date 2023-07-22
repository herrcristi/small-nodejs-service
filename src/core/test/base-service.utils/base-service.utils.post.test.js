const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');
const RestMessagesUtils = require('../../utils/rest-messages.utils.js');
const BaseServiceUtils = require('../../utils/base-service.utils.js');
const RestApiUtils = require('../../utils/rest-api.utils.js');

describe('Base Service', function () {
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
   * post with success
   */
  it('should call post with success', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
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
        post: sinon.stub().callsFake((objInfo) => {
          return {
            value: {
              id: 'id1',
              name: objInfo.name,
              type: 'type',
              status: 'pending',
            },
          };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.post(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.post.callCount).to.equal(1);

    chai.expect(response).to.deep.equal({
      status: 201,
      value: {
        id: 'id1',
        name: 'name',
        type: 'type',
        status: 'pending',
      },
    });
  }).timeout(10000);

  /**
   * post fail due to invalid request
   */
  it('should post fail due to invalid request', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
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
        post: sinon.stub().callsFake((objInfo) => {
          return {
            value: {
              id: 'id1',
              name: objInfo.name,
              type: 'type',
              status: 'pending',
            },
          };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.post(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.post.callCount).to.equal(0);

    chai.expect(response).to.deep.equal({
      status: 400,
      error: {
        message: 'Test error message',
      },
    });
  }).timeout(10000);

  /**
   * post fail
   */
  it('should post fail', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
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
        post: sinon.stub().callsFake((objInfo) => {
          return { error: { message: 'Test error message', error: new Error('Test error').toString() } };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.post(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.post.callCount).to.equal(1);

    chai.expect(response).to.deep.equal({
      status: 500,
      error: 'Error: Test error',
    });
  }).timeout(10000);
});
