const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const RestCommsUtils = require('../../utils/rest-communications.utils.js');
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
   * getAll local with success
   */
  it('should call getAll local with success', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          getAll: sinon.stub().callsFake((filter) => {
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
    let res = await RestCommsUtils.getAll(serviceName, { filter: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].getAll.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      value: [
        {
          id: 'id1',
        },
      ],
    });
  }).timeout(10000);

  /**
   * getAll local fail
   */
  it('should call getAll local and fail', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          getAll: sinon.stub().callsFake((filter) => {
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

    sinon.stub(RestApiUtils, 'buildMongoFilterFromReq').returns({
      error: { message: 'Test error message', error: new Error('Test error').toString() },
    });

    // call
    await RestCommsUtils.init(localConfig);
    let res = await RestCommsUtils.getAll(serviceName, { filter: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].getAll.callCount).to.equal(0);

    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        error: 'Error: Test error',
        message: 'Test error message',
      },
    });
  }).timeout(10000);

  /**
   * getAll remote with success
   */
  it('should call getAll remote with success', async () => {
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
      data: [{ id: 'id1' }],
      meta: { count: 1, limit: 0, skip: 0 },
    });

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.getAll(serviceName, `?id=id1&sort=id&limit=10`, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: [
        {
          id: 'id1',
        },
      ],
      meta: {
        count: 1,
        limit: 0,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * getAll remote with failure
   */
  it('should call getAll remote with failure', async () => {
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

    let res = await RestCommsUtils.getAll(serviceName, `?id=id1&sort=id&limit=10`, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai
      .expect(res.error.message)
      .to.include('Calling GET http://localhost:8080/api/v1/service?id=id1&sort=id&limit=10 failed with status 500');
  }).timeout(10000);
});
