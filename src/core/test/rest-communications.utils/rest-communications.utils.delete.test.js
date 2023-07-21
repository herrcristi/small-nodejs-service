const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const CommonUtils = require('../../utils/common.utils.js');
const RestMessagesUtils = require('../../utils/rest-messages.utils.js');
const RestCommsUtils = require('../../utils/rest-communications.utils.js');
const RestControllerUtils = require('../../utils/rest-controller.utils.js');
const RestApiUtils = require('../../utils/rest-api.utils.js');

describe('Rest Communications Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  let currentConfig = null;
  let mockAxios = null;

  before(async function () {});

  beforeEach(async function () {
    mockAxios = new MockAdapter(axios);
    currentConfig = await RestCommsUtils.getConfig();
  });

  afterEach(async function () {
    mockAxios?.restore();
    sinon.restore();
    RestCommsUtils.init(currentConfig);
  });

  after(async function () {});

  /**
   * delete local with success
   */
  it('should call delete local with success', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          delete: sinon.stub().callsFake((objID) => {
            return {
              value: {
                id: objID,
                name: 'name',
                type: 'type',
              },
            };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    let res = await RestCommsUtils.delete(serviceName, 'id1', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].delete.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      value: {
        id: 'id1',
        name: 'name',
        type: 'type',
      },
    });
  }).timeout(10000);

  /**
   * delete local fail
   */
  it('should call delete local and fail', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          delete: sinon.stub().callsFake((objInfo) => {
            return { error: { message: 'Test error message', error: new Error('Test error').toString() } };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    let res = await RestCommsUtils.delete(serviceName, 'id1', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].delete.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      error: {
        error: 'Error: Test error',
        message: 'Test error message',
      },
    });
  }).timeout(10000);

  /**
   * delete remote with success
   */
  it('should call delete remote with success', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      rest: {
        [serviceName]: {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT, // see test.utils.js
          path: '/api/v1/service',
        },
      },
    };

    // stub
    mockAxios.onDelete().reply(200, {
      id: 'id1',
      name: 'name',
      type: 'type',
    });

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.delete(serviceName, 'id1', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: 'id1',
        name: 'name',
        type: 'type',
      },
    });
  }).timeout(10000);

  /**
   * delete remote with failure
   */
  it('should call delete remote with failure', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      rest: {
        [serviceName]: {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT, // see test.utils.js
          path: '/api/v1/service',
        },
      },
    };

    // stub
    mockAxios.onDelete().reply(500, {});

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.delete(serviceName, 'id1', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai
      .expect(res.error.message)
      .to.include('Calling DELETE http://localhost:8080/api/v1/service/id1 failed with status 500');
  }).timeout(10000);
});
