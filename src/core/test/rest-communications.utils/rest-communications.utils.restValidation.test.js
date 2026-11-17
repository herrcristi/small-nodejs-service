const _ = require('lodash');
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
      s2sPass: process.env.SMALL_API_S2SPASS,

      rest: {
        [serviceName]: {
          protocol: 'http',
          host: 'localhost',
          port: process.env.SMALL_API_PORT, // see test.utils.js
          path: '/api/v1/service',
        },
      },
    };

    const configUrl = `http://localhost:${process.env.SMALL_API_PORT}`;

    // stub
    let s2sToken;
    mockAxios.onPatch().reply((config) => {
      chai.expect(config.method).to.equal('patch');
      chai.expect(config.url).to.equal(`${configUrl}/api/v1/service/id1`);

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
        reqMethod: 'patch',
        reqUrl: '/api/v1/service/id1',
        userID: 'userID',
        username: 'user@test.com',
        tenantName: 'School A',
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

    // the receiving request: the same method and path
    const ctx = { ..._ctx, reqMethod: 'PATCH', reqPath: '/api/v1/service/id1' };
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
          reqMethod: 'patch',
          reqUrl: '/api/v1/service/id1',
          userID: 'userID',
          username: 'user@test.com',
          tenantName: 'School A',
          ipAddress: 'ip',
        },
        method: 'PATCH',
        url: `${configUrl}/api/v1/service/id1`,
        timestamp: rv.value.timestamp,
        jti: rv.value.jti,
      },
    });
    chai.expect(rv.value.jti).to.be.a('string').and.not.empty;
    chai.expect(ctx).to.deep.equal({
      ..._ctx,
      reqMethod: 'PATCH',
      reqPath: '/api/v1/service/id1',
      callerMethod: 'patch',
      callerUrl: '/api/v1/service/id1',
      initialMethod: 'patch',
      initialUrl: '/api/v1/service/id1',
      ipAddress: 'ip',
      userID: 'userID',
      username: 'user@test.com',
      tenantName: 'School A',
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
      s2sPass: process.env.SMALL_API_S2SPASS,

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
      s2sPass: process.env.SMALL_API_S2SPASS,

      rest: {
        [serviceName]: {
          protocol: 'http',
          host: 'localhost',
          port: process.env.SMALL_API_PORT, // see test.utils.js
          path: '/api/v1/service',
        },
      },
    };

    const configUrl = `http://localhost:${process.env.SMALL_API_PORT}`;

    // stub
    let s2sToken;
    mockAxios.onPatch().reply((config) => {
      chai.expect(config.method).to.equal('patch');
      chai.expect(config.url).to.equal(`${configUrl}/api/v1/service/id1`);

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

  /**
   * a token is only for its request (method and path), for a short time, and only once
   */
  describe('token binding', function () {
    const issuer = 'test-issuer';
    const url = 'http://localhost:8080/api/internal_v1/users';
    const receiver = { ..._ctx, reqMethod: 'GET', reqPath: '/api/internal_v1/users' };

    // a token as the caller builds it (encrypted with the service password)
    const token = (data) =>
      JwtUtils.encrypt(
        {
          _ctx: { ..._ctx },
          method: 'GET',
          url,
          timestamp: new Date().toISOString(),
          jti: `jti-${Math.random()}`,
          ...data,
        },
        issuer,
        _ctx,
        process.env.SMALL_API_S2SPASS
      ).value;
    const validate = (s2sToken, ctx = receiver) => RestCommsUtils.restValidation(s2sToken, { ...ctx });

    beforeEach(async function () {
      await RestCommsUtils.init({ issuer, s2sPass: process.env.SMALL_API_S2SPASS, rest: {} });
    });

    it('should accept a token once', () => {
      const s2sToken = token();

      chai.expect(validate(s2sToken).status).to.equal(200);
      chai.expect(validate(s2sToken).error.message).to.equal('Token was already used');
    });

    it('should refuse a token without an id', () => {
      chai.expect(validate(token({ jti: undefined })).error.message).to.equal('Token was already used');
    });

    it('should refuse a token for another method or path', () => {
      chai.expect(validate(token({ method: 'POST' })).error.message).to.equal('Token is not for this request');
      chai.expect(validate(token({ url: `${url}/id1` })).error.message).to.equal('Token is not for this request');
      chai.expect(validate(token({ url: 'not a url' })).error.message).to.equal('Token is not for this request');

      // a GET with a query string: only the path is compared
      chai.expect(validate(token({ url: `${url}?email=a%40b.test&limit=1` })).status).to.equal(200);
    });

    it('should refuse a token without a valid time, too old, or from the future', () => {
      const now = Date.now();
      for (const timestamp of [
        undefined,
        'not a date',
        new Date(now - 61 * 1000).toISOString(),
        new Date(now + 6 * 1000).toISOString(),
        new Date(now + 365 * 24 * 3600 * 1000).toISOString(),
      ]) {
        chai.expect(validate(token({ timestamp })).error.message).to.equal('Token is expired');
      }

      // a few seconds in the future is accepted (the clocks of two pods differ)
      chai.expect(validate(token({ timestamp: new Date(now + 4 * 1000).toISOString() })).status).to.equal(200);
    });

    it('should forget the ids of the expired tokens', () => {
      const first = token();
      chai.expect(validate(first).status).to.equal(200);

      // later: the first id is removed when the next token is checked, and the first token is expired anyway
      clock.tick(2 * 60 * 1000);
      chai.expect(validate(token()).status).to.equal(200);
      chai.expect(validate(first).error.message).to.equal('Token is expired');
    });
  });
});
