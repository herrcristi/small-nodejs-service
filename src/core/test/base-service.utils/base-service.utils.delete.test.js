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
   * delete with success
   */
  it('should call delete with success', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
      params: { id: 'id1' },
    };

    // stub
    let controller = {
      name: 'Service',
      schema: 'schema',
      service: {
        delete: sinon.stub().callsFake((objID) => {
          return {
            value: {
              id: objID,
              name: 'name',
              type: 'type',
              status: 'status',
            },
          };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.delete(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.delete.callCount).to.equal(1);

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
   * fail to delete
   */
  it('should fail to delete', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
      params: { id: 'id1' },
    };

    // stub
    let controller = {
      name: 'Service',
      schema: 'schema',
      service: {
        delete: sinon.stub().callsFake((objID) => {
          return { error: { message: 'Test error message', error: new Error('Test error').toString() } };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.delete(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.delete.callCount).to.equal(1);

    chai.expect(response).to.deep.equal({
      status: 500,
      error: 'Error: Test error',
    });
  }).timeout(10000);

  /**
   * delete not found
   */
  it('should fail to delete - not found', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
      params: { id: 'id1' },
    };

    // stub
    let controller = {
      name: 'Service',
      schema: 'schema',
      service: {
        delete: sinon.stub().callsFake((objID) => {
          return { value: null };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.delete(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.delete.callCount).to.equal(1);

    chai.expect(response).to.deep.equal({
      status: 404,
      error: 'id1',
    });
  }).timeout(10000);
});
