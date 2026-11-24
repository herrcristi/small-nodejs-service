const chai = require('chai');
const sinon = require('sinon');
const express = require('express');
const supertest = require('supertest');
const rateLimit = require('express-rate-limit');

const RateLimiterMiddleware = require('../../web-server/rate-limiter.middleware.js');
const RestCommsUtils = require('../../utils/rest-communications.utils.js');
const RequestMiddleware = require('../../web-server/request.middleware.js');
const WebServerUtils = require('../../web-server/web-server.utils.js');

/**
 * the limits are skipped in debug mode (the tests run in it), so these tests run as production
 * the limits are given by the application (init), as strings like the environment
 */
describe('Rate limiter middleware', function () {
  let savedNodeEnv;
  const limits = { loginMax: '2', loginAccountMax: '3', resetMax: '2' };

  before(async function () {});

  beforeEach(function () {
    savedNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    RateLimiterMiddleware.init(limits);
  });

  afterEach(function () {
    sinon.restore();
    process.env.NODE_ENV = savedNodeEnv;
    RateLimiterMiddleware.init({}); // the defaults (the tests of the service run in debug mode: no limit)
  });

  after(async function () {});

  /**
   * a small app with the login and reset password limits; the password 'right' logs in, any other fails
   */
  const getApp = () => {
    const app = express();
    app.set('trust proxy', WebServerUtils.getTrustProxy('1'));
    app.use(express.json());
    const login = [rateLimit(RateLimiterMiddleware.loginLimiter), rateLimit(RateLimiterMiddleware.loginAccountLimiter)];
    app.post('/login', ...login, (req, res) => res.status(req.body.password === 'right' ? 200 : 401).end());
    app.post('/reset', rateLimit(RateLimiterMiddleware.resetPasswordLimiter), (req, res) => res.status(200).end());
    return app;
  };
  const login = (app, username, password, ip) =>
    supertest(app).post('/login').set('x-forwarded-for', ip).send({ username, password });

  /**
   * the requests of a client address are limited; a call of another service (a valid service token) is not, so the
   * services can call each other when they run apart
   */
  it('should limit the requests of a client, not the calls of another service', async () => {
    // stub: the requests with a service token are calls of a service (RestCommsUtils checks the token)
    sinon.stub(RestCommsUtils, 'isS2SRequest').callsFake((req) => !!req.headers['x-s2s-token']);
    RateLimiterMiddleware.init({ max: '2' });
    const app = express();
    app.get('/data', rateLimit(RateLimiterMiddleware.authLimiter), (req, res) => res.status(200).end());
    const get = () => supertest(app).get('/data');

    // a client: 2 requests, then limited
    chai.expect((await get()).status).to.equal(200);
    chai.expect((await get()).status).to.equal(200);
    chai.expect((await get()).status).to.equal(429);

    // a service: not limited
    for (let i = 0; i < 3; i++) {
      chai.expect((await get().set('x-s2s-token', 'token')).status).to.equal(200);
    }
  });

  /**
   * the failed logins of an account from one address are limited
   */
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

  /**
   * the failed logins of an account are limited also when they come from many addresses
   */
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

  /**
   * the reset password emails of an account are limited (from any address)
   */
  it('should limit the reset password emails of an account', async () => {
    const app = getApp();
    const reset = (username, ip) => supertest(app).post('/reset').set('x-forwarded-for', ip).send({ username });

    // 2 emails for the account, the third is limited (the username case does not matter); another account is not
    chai.expect((await reset('user@testdomain.test', '203.0.113.21')).status).to.equal(200);
    chai.expect((await reset('user@testdomain.test', '203.0.113.22')).status).to.equal(200);
    chai.expect((await reset('User@testdomain.test', '203.0.113.23')).status).to.equal(429);
    chai.expect((await reset('other@testdomain.test', '203.0.113.21')).status).to.equal(200);

    // a request without a username has its own (empty) account key
    chai.expect((await supertest(app).post('/reset').set('x-forwarded-for', '203.0.113.24')).status).to.equal(200);
  });

  /**
   * in debug mode nothing is limited
   */
  it('should not limit in debug mode', async () => {
    process.env.NODE_ENV = 'dev';
    const app = getApp();

    // more failures than the limit: still answered 401, not 429
    for (let i = 0; i < 5; i++) {
      chai.expect((await login(app, 'user@testdomain.test', 'wrong', '203.0.113.31')).status).to.equal(401);
    }
  });

  /**
   * a missing or a wrong limit falls back to the default
   */
  it('should use the default limits when they are not configured', async () => {
    // no login limit, a wrong account limit
    RateLimiterMiddleware.init({ loginAccountMax: 'not a number' });
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
  /**
   * the trust proxy setting: a number of proxies or a list of addresses, never "trust all"
   */
  it('should read the trust proxy setting', () => {
    // each value and its setting
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
      // check
      chai.expect(WebServerUtils.getTrustProxy(value), `${value}`).to.deep.equal(expected);
    }
  });

  /**
   * the client address is read from x-forwarded-for only when a proxy is trusted
   */
  it('should take the client address from x-forwarded-for only through a trusted proxy', async () => {
    // a small app that answers the client address
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
