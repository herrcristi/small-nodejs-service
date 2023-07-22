const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const RestCommsUtils = require('../../utils/rest-communications.utils.js');

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
   * post local with success
   */
  it('should call post local with success', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          post: sinon.stub().callsFake((objInfo) => {
            return {
              value: {
                ...objInfo,
                id: 'id1',
                type: 'type',
              },
            };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    let res = await RestCommsUtils.post(serviceName, { name: 'name' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].post.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      value: {
        id: 'id1',
        name: 'name',
        type: 'type',
      },
    });
  }).timeout(10000);

  /**
   * post local fail
   */
  it('should call post local and fail', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          post: sinon.stub().callsFake((objInfo) => {
            return { error: { message: 'Test error message', error: new Error('Test error').toString() } };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    let res = await RestCommsUtils.post(serviceName, { name: 'name' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].post.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      error: {
        error: 'Error: Test error',
        message: 'Test error message',
      },
    });
  }).timeout(10000);

  /**
   * post remote with success
   */
  it('should call post remote with success', async () => {
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
    mockAxios.onPost().reply(201, {
      id: 'id1',
      name: 'name',
      type: 'type',
    });

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.post(serviceName, { name: 'name' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        id: 'id1',
        name: 'name',
        type: 'type',
      },
    });
  }).timeout(10000);

  /**
   * post remote with failure
   */
  it('should call post remote with failure', async () => {
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
    mockAxios.onPost().reply(500, {});

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.post(serviceName, { name: 'name' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai
      .expect(res.error.message)
      .to.include('Calling POST http://localhost:8080/api/v1/service failed with status 500');
  }).timeout(10000);
});
