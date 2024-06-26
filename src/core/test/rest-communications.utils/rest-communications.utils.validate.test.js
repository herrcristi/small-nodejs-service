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
   * validate local with success
   */
  it('should call validate local with success', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          validate: sinon.stub().callsFake((validateInfo) => {
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
    let res = await RestCommsUtils.validate(
      serviceName,
      { token: 'token', method: 'get', route: '/api/v1/schools' },
      'cookieTokenName',
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].validate.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * validate local fail
   */
  it('should call validate local and fail', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          validate: sinon.stub().callsFake((validateInfo) => {
            return { error: { message: 'Test error message', error: new Error('Test error').toString() } };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    let res = await RestCommsUtils.validate(
      serviceName,
      { token: 'token', method: 'get', route: '/api/v1/schools' },
      'cookieTokenName',
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].validate.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      error: {
        error: 'Error: Test error',
        message: 'Test error message',
      },
    });
  }).timeout(10000);

  /**
   * validate remote with success
   */
  it('should call validate remote with success', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      rest: {
        [serviceName]: {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT, // see test.utils.js
          path: '/api/internal_v1/service/validate',
        },
      },
    };

    // stub
    mockAxios.onGet().reply((config) => {
      chai.expect(config.method).to.equal('get');
      chai
        .expect(config.url)
        .to.equal(
          'http://localhost:8080/api/internal_v1/service/validate/validate?method=get&route=%2Fapi%2Fv1%2Fschools'
        );
      chai.expect(config.headers.cookie).to.equal('cookieTokenName=token');

      return [200, true];
    });

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.validate(
      serviceName,
      { token: 'token', method: 'get', route: '/api/v1/schools' },
      'cookieTokenName',
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * validate remote with failure
   */
  it('should call validate remote with failure', async () => {
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
    mockAxios.onGet().reply(500, null);

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.validate(
      serviceName,
      { token: 'token', method: 'get', route: '/api/v1/schools' },
      'cookieTokenName',
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res.error.message).to.include('Calling GET http://localhost:8080/api/internal_v1/service/validate');
    chai.expect(res.error.message).to.include('failed with status 500');
  }).timeout(10000);
});
