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
   * getAllByIDs local with success
   */
  it('should call getAllByIDs local with success', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          getAllByIDs: sinon.stub().callsFake((ids, projection) => {
            return {
              value: [
                {
                  id: 'id1',
                },
              ],
            };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    let res = await RestCommsUtils.getAllByIDs(serviceName, ['id1'], { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].getAllByIDs.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      value: [
        {
          id: 'id1',
        },
      ],
    });
  }).timeout(10000);

  /**
   * getAllByIDs local fail
   */
  it('should call getAllByIDs local and fail', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          getAllByIDs: sinon.stub().callsFake((ids, projection) => {
            return { error: { message: 'Test error message', error: new Error('Test error').toString() } };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    let res = await RestCommsUtils.getAllByIDs(serviceName, ['id1'], { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].getAllByIDs.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      error: {
        error: 'Error: Test error',
        message: 'Test error message',
      },
    });
  }).timeout(10000);

  /**
   * getAllByIDs remote with success
   */
  it('should call getAllByIDs remote with success', async () => {
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
    mockAxios.onGet().reply(200, {
      data: [{ id: 'id1', name: 'name' }],
      meta: { count: 1, limit: 0, skip: 0 },
    });

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.getAllByIDs(serviceName, ['id1'], { id: 1, name: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res).to.deep.equal({
      value: [
        {
          id: 'id1',
          name: 'name',
        },
      ],
    });
  }).timeout(10000);

  /**
   * getAllByIDs remote with failure
   */
  it('should call getAllByIDs remote with failure', async () => {
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
    mockAxios.onGet().reply(500, {});

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.getAllByIDs(serviceName, ['id1'], null, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai
      .expect(res.error.message)
      .to.include('Calling GET http://localhost:8080/api/v1/service?id=id1 failed with status 500');
  }).timeout(10000);
});
