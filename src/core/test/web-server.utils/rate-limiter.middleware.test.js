const chai = require('chai');
const express = require('express');
const supertest = require('supertest');
const rateLimit = require('express-rate-limit');

const RateLimiterMiddleware = require('../../web-server/rate-limiter.middleware.js');
const RequestMiddleware = require('../../web-server/request.middleware.js');
const WebServerUtils = require('../../web-server/web-server.utils.js');

/**
 * the limits are skipped in debug mode (the tests run in it), so these tests run as production
 */
describe('Rate limiter middleware', function () {
  const saved = {};
  const env = {
    NODE_ENV: 'production',
    SMALL_API_RATE_LIMIT_LOGIN_MAX: '2',
    SMALL_API_RATE_LIMIT_LOGIN_ACCOUNT_MAX: '3',
    SMALL_API_RATE_LIMIT_RESET_MAX: '2',
    SMALL_API_TRUST_PROXY: '1',
  };

  beforeEach(function () {
    for (const key in env) {
      saved[key] = process.env[key];
      process.env[key] = env[key];
    }
  });

  afterEach(function () {
    for (const key in env) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  /**
   * a small app with the login and reset password limits; the password 'right' logs in, any other fails
   */
  const getApp = () => {
    const app = express();
    app.set('trust proxy', WebServerUtils.getTrustProxy());
    app.use(express.json());
    const login = [rateLimit(RateLimiterMiddleware.loginLimiter), rateLimit(RateLimiterMiddleware.loginAccountLimiter)];
    app.post('/login', ...login, (req, res) => res.status(req.body.password === 'right' ? 200 : 401).end());
    app.post('/reset', rateLimit(RateLimiterMiddleware.resetPasswordLimiter), (req, res) => res.status(200).end());
    return app;
  };
  const login = (app, username, password, ip) =>
    supertest(app).post('/login').set('x-forwarded-for', ip).send({ username, password });

  it('should limit the failed logins of an account from one address, not the successful ones', async () => {
    const app = getApp();

    // successful logins are not counted
    for (let i = 0; i < 3; i++) {
      chai.expect((await login(app, 'user@testdomain.test', 'right', '203.0.113.1')).status).to.equal(200);
    }

    // 2 failures, then the account is limited from this address (also with the right password)
    chai.expect((await login(app, 'user@testdomain.test', 'wrong', '203.0.113.1')).status).to.equal(401);
    chai.expect((await login(app, 'USER@testdomain.test ', 'wrong', '203.0.113.1')).status).to.equal(401);
    chai.expect((await login(app, 'user@testdomain.test', 'right', '203.0.113.1')).status).to.equal(429);

    // other accounts from the same address, and the same account from another address, still log in
    chai.expect((await login(app, 'other@testdomain.test', 'right', '203.0.113.1')).status).to.equal(200);
    chai.expect((await login(app, 'user@testdomain.test', 'right', '203.0.113.2')).status).to.equal(200);
  });

  it('should limit the failed logins of an account from all the addresses', async () => {
    const app = getApp();

    // 3 failures from 3 addresses
    for (const ip of ['203.0.113.11', '203.0.113.12', '203.0.113.13']) {
      chai.expect((await login(app, 'user@testdomain.test', 'wrong', ip)).status).to.equal(401);
    }
    chai.expect((await login(app, 'user@testdomain.test', 'right', '203.0.113.14')).status).to.equal(429);

    // another account is not affected
    chai.expect((await login(app, 'other@testdomain.test', 'right', '203.0.113.14')).status).to.equal(200);
  });

  it('should limit the reset password emails of an account', async () => {
    const app = getApp();
    const reset = (username, ip) => supertest(app).post('/reset').set('x-forwarded-for', ip).send({ username });

    chai.expect((await reset('user@testdomain.test', '203.0.113.21')).status).to.equal(200);
    chai.expect((await reset('user@testdomain.test', '203.0.113.22')).status).to.equal(200);
    chai.expect((await reset('User@testdomain.test', '203.0.113.23')).status).to.equal(429);
    chai.expect((await reset('other@testdomain.test', '203.0.113.21')).status).to.equal(200);

    // a request without a username has its own (empty) account key
    chai.expect((await supertest(app).post('/reset').set('x-forwarded-for', '203.0.113.24')).status).to.equal(200);
  });

  it('should not limit in debug mode', async () => {
    process.env.NODE_ENV = 'dev';
    const app = getApp();

    for (let i = 0; i < 5; i++) {
      chai.expect((await login(app, 'user@testdomain.test', 'wrong', '203.0.113.31')).status).to.equal(401);
    }
  });

  it('should use the default limits when they are not configured', async () => {
    delete process.env.SMALL_API_RATE_LIMIT_LOGIN_MAX;
    process.env.SMALL_API_RATE_LIMIT_LOGIN_ACCOUNT_MAX = 'not a number';
    const app = getApp();

    // default: 5 failures of an account from an address
    for (let i = 0; i < 5; i++) {
      chai.expect((await login(app, 'user@testdomain.test', 'wrong', '203.0.113.41')).status).to.equal(401);
    }
    chai.expect((await login(app, 'user@testdomain.test', 'wrong', '203.0.113.41')).status).to.equal(429);
  });
});

/**
 * the client address: from the trusted proxies only
 */
describe('Trust proxy and client address', function () {
  let saved;

  beforeEach(function () {
    saved = process.env.SMALL_API_TRUST_PROXY;
  });

  afterEach(function () {
    if (saved === undefined) {
      delete process.env.SMALL_API_TRUST_PROXY;
    } else {
      process.env.SMALL_API_TRUST_PROXY = saved;
    }
  });

  it('should read the trust proxy setting', () => {
    for (const [value, expected] of [
      [undefined, false],
      ['', false],
      ['false', false],
      ['true', false], // trusting every proxy would let a client choose its address
      ['TRUE', false],
      ['1', 1],
      [' 2 ', 2],
      ['loopback, 10.0.0.0/8', 'loopback, 10.0.0.0/8'],
    ]) {
      if (value === undefined) {
        delete process.env.SMALL_API_TRUST_PROXY;
      } else {
        process.env.SMALL_API_TRUST_PROXY = value;
      }
      chai.expect(WebServerUtils.getTrustProxy()).to.deep.equal(expected);
    }
  });

  it('should take the client address from x-forwarded-for only through a trusted proxy', async () => {
    const getApp = (trustProxy) => {
      const app = express();
      app.set('trust proxy', trustProxy);
      app.use(RequestMiddleware.middleware);
      app.get('/ip', (req, res) => res.status(200).json({ ip: req._ctx.ipAddress }));
      return app;
    };

    // no trusted proxy: the header is ignored
    let res = await supertest(getApp(false)).get('/ip').set('x-forwarded-for', '198.51.100.7');
    chai.expect(res.body.ip).to.not.equal('198.51.100.7');

    // one trusted proxy: the last address added by it
    res = await supertest(getApp(1)).get('/ip').set('x-forwarded-for', '192.0.2.1, 198.51.100.7');
    chai.expect(res.body.ip).to.equal('198.51.100.7');
  });
});
