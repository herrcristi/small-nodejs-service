const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const RestCommsUtils = require('../../utils/rest-communications.utils.js');
const JwtUtils = require('../../utils/jwt.utils.js');

describe('Rest Communications Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  let currentConfig = null;
  let mockAxios = null;

  before(async function () {});

  beforeEach(async function () {
    mockAxios = new MockAdapter(axios);
    currentConfig = await RestCommsUtils.getConfig();
    sinon.stub(JwtUtils, 'encrypt').returns({ status: 200, value: 's2stoken' });
  });

  afterEach(async function () {
    mockAxios?.restore();
    sinon.restore();
    RestCommsUtils.init(currentConfig);
  });

  after(async function () {});

  /**
   * call local post with success
   */
  it('should call local post with success', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          login: sinon.stub().callsFake((loginInfo) => {
            return {
              status: 200,
              value: true,
            };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    const config = {
      serviceName,
      method: 'POST',
      path: '/login',
      body: { id: 'email@test.com', password: 'password' },
    };
    let res = await RestCommsUtils.call(config, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].login.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * call local get with success
   */
  it('should call local get with success', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          login: sinon.stub().callsFake((ids) => {
            chai.expect(ids).to.deep.equal(['id1']);
            return {
              status: 200,
              value: true,
            };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    const config = {
      serviceName,
      method: 'GET',
      path: '/login',
      query: { ids: ['id1'] },
      body: { id: 'email@test.com', password: 'password' },
    };
    let res = await RestCommsUtils.call(config, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].login.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * call local fail
   */
  it('should call local and fail', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          login: sinon.stub().callsFake((loginInfo) => {
            return { error: { message: 'Test error message', error: new Error('Test error').toString() } };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    const config = {
      serviceName,
      method: 'POST',
      path: '/login',
      body: { id: 'email@test.com', password: 'password' },
    };
    let res = await RestCommsUtils.call(config, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].login.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      error: {
        error: 'Error: Test error',
        message: 'Test error message',
      },
    });
  }).timeout(10000);

  /**
   * call remote with success
   */
  it('should call remote with success', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      rest: {
        [serviceName]: {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT, // see test.utils.js
          path: '/api/internal_v1/service',
        },
      },
    };

    // stub
    mockAxios.onPost().reply(200, true);

    // call
    await RestCommsUtils.init(restConfig);

    const config = {
      serviceName,
      method: 'POST',
      path: '/login',
      body: { id: 'email@test.com', password: 'password' },
    };
    let res = await RestCommsUtils.call(config, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * call remote with failure
   */
  it('should call remote with failure', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      rest: {
        [serviceName]: {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT, // see test.utils.js
          path: '/api/internal_v1/service',
        },
      },
    };

    // stub
    mockAxios.onPost().reply(500, {});

    // call
    await RestCommsUtils.init(restConfig);

    const config = {
      serviceName,
      method: 'POST',
      path: '/login',
      body: { id: 'email@test.com', password: 'password' },
    };
    let res = await RestCommsUtils.call(config, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai
      .expect(res.error.message)
      .to.include('Calling POST http://localhost:8080/api/internal_v1/service/login failed with status 500');
  }).timeout(10000);
});
