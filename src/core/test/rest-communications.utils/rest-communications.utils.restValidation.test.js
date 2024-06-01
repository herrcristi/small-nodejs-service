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
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service', tenantID: 'tenantID' };
  let currentConfig = null;
  let mockAxios = null;
  let clock = null;

  before(async function () {});

  beforeEach(async function () {
    mockAxios = new MockAdapter(axios);
    clock = sinon.useFakeTimers();
    currentConfig = await RestCommsUtils.getConfig();
  });

  afterEach(async function () {
    mockAxios?.restore();
    sinon.restore();
    RestCommsUtils.init(currentConfig);
  });

  after(async function () {});

  /**
   * restValidation with success
   */
  it('should restValidation with success', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      issuer: 'test-issuer',
      s2sPass: process.env.S2SPASS,

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
    let s2sToken;
    mockAxios.onPatch().reply((config) => {
      chai.expect(config.method).to.equal('patch');
      chai.expect(config.url).to.equal('http://localhost:8080/api/v1/service/id1');

      console.log(`\nRequest headers: ${JSON.stringify(config.headers, null, 2)}`);
      requestHeaders = config.headers;
      s2sToken = config.headers['x-s2s-token'];

      return [200, { id: 'id1', name: 'name', type: 'type' }];
    });

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.restCall(
      {
        serviceName,
        method: 'patch',
        path: '/id1',
        body: { set: { name: 'name' } },
      },
      {
        ..._ctx,
        method: 'patch',
        url: '/api/v1/service/id1',
        userID: 'userID',
        username: 'user@test.com',
        ipAddress: 'ip',
      }
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { id: 'id1', name: 'name', type: 'type' },
    });

    // rest validation
    chai.expect(s2sToken).to.exist;

    const ctx = { ..._ctx };
    const rv = RestCommsUtils.restValidation(s2sToken, ctx);
    console.log(`\ns2s validation returned: ${JSON.stringify(rv, null, 2)}`);
    chai.expect(rv).to.deep.equal({
      status: 200,
      value: {
        _ctx: {
          reqID: 'testReq',
          lang: 'en',
          service: 'Service',
          tenantID: 'tenantID',
          method: 'patch',
          url: '/api/v1/service/id1',
          userID: 'userID',
          username: 'user@test.com',
          ipAddress: 'ip',
        },
        method: 'PATCH',
        url: 'http://localhost:8080/api/v1/service/id1',
        timestamp: rv.value.timestamp,
      },
    });
    chai.expect(ctx).to.deep.equal({
      ..._ctx,
      callerMethod: 'patch',
      callerUrl: '/api/v1/service/id1',
      initialMethod: 'patch',
      initialUrl: '/api/v1/service/id1',
      ipAddress: 'ip',
      userID: 'userID',
      username: 'user@test.com',
    });
  }).timeout(10000);

  /**
   * restValidation with failure
   */
  it('should restValidation with failure', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      issuer: 'test-issuer',
      s2sPass: process.env.S2SPASS,

      rest: {},
    };

    // call init
    await RestCommsUtils.init(restConfig);

    // call
    const res = RestCommsUtils.restValidation('token', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Cannot decrypt data',
        error: new Error('Cannot decrypt data'),
      },
    });
  }).timeout(10000);

  /**
   * restValidation token expired
   */
  it('should restValidation token expired', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      issuer: 'test-issuer',
      s2sPass: process.env.S2SPASS,

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
    let s2sToken;
    mockAxios.onPatch().reply((config) => {
      chai.expect(config.method).to.equal('patch');
      chai.expect(config.url).to.equal('http://localhost:8080/api/v1/service/id1');

      console.log(`\nRequest headers: ${JSON.stringify(config.headers, null, 2)}`);
      requestHeaders = config.headers;
      s2sToken = config.headers['x-s2s-token'];

      return [
        200,
        {
          id: 'id1',
          name: 'name',
          type: 'type',
        },
      ];
    });

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.restCall(
      {
        serviceName,
        method: 'patch',
        path: '/id1',
        body: { set: { name: 'name' } },
      },
      { ..._ctx }
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { id: 'id1', name: 'name', type: 'type' },
    });

    chai.expect(s2sToken).to.exist;

    // time
    const time = new Date();
    clock.tick(60 * 1000 + 10); // 1 minute
    console.log(`\nElapsed time: ${new Date() - time}`);

    const ctx = { ..._ctx };
    const rv = RestCommsUtils.restValidation(s2sToken, ctx);
    console.log(`\ns2s validation returned: ${JSON.stringify(rv, null, 2)}`);

    chai.expect(rv).to.deep.equal({
      status: 401,
      error: {
        message: 'Token is expired',
        error: new Error('Token is expired'),
      },
    });
  }).timeout(10000);
});
