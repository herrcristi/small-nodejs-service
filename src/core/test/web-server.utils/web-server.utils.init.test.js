const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const express = require('express');

const WebServer = require('../../web-server/web-server.utils.js');
const CommonUtils = require('../../utils/common.utils.js');
const TestConstants = require('../../../test/test-constants.js');

/**
 * the settings of a web server of the tests: the origins of the requests of the tests
 */

describe('Web Server Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  let server = null;

  before(async function () {});

  beforeEach(async function () {
    server = null;
  });

  afterEach(async function () {
    sinon.restore();
    server?.close();
  });

  after(async function () {});

  /**
   * init
   */
  it('should init success', async () => {
    const port = 8091;
    const path = '/test/webserver';

    const router = express.Router();
    router.route(path).get(async (req, res) => {
      console.log(`\nRoute path ${path} called\n`);
      res.status(200).json({ success: true });
      res.end();
    });

    let middlewares = [
      {
        middleware: sinon.stub().callsFake((req, res, next) => {
          console.log(`\nMiddleware0 called route ${JSON.stringify(req.route, null, 2)}\n`);

          chai.expect(req.route).to.equal(undefined);
          next();
        }),
      },
      sinon.stub().callsFake((req, res, next) => {
        console.log(`\nMiddleware1 called route ${JSON.stringify(req.route, null, 2)}\n`);

        chai.expect(req.route).to.equal(undefined);
        next();
      }),
    ];

    let authMiddlewares = [
      {
        middleware: sinon.stub().callsFake((req, res, next) => {
          console.log(`\nAuth Middleware0 called route ${JSON.stringify(req.route, null, 2)}\n`);

          chai.expect(req.route.path).to.equal('/test/webserver');
          next();
        }),
      },
      sinon.stub().callsFake((req, res, next) => {
        console.log(`\nAuth Middleware1 called route ${JSON.stringify(req.route, null, 2)}\n`);

        chai.expect(req.route.path).to.equal('/test/webserver');
        next();
      }),
    ];

    // call
    const settings = { corsOrigins: [TestConstants.WebServer, `http://localhost:${port}`] };
    let web = await WebServer.init(port, [router], middlewares, authMiddlewares, settings);
    server = web?.server;

    // check
    chai.expect(web.app.mountpath).to.equal('/');

    let res = await supertest(`http://localhost:${port}`).get(`${path}`).set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({ success: true });
    chai.expect(middlewares[0].middleware.callCount).to.equal(1);
    chai.expect(middlewares[1].callCount).to.equal(1);
    chai.expect(authMiddlewares[0].middleware.callCount).to.equal(1);
    chai.expect(authMiddlewares[1].callCount).to.equal(1);
  }).timeout(10000);

  /**
   * init route is not array
   */
  it('should init route is not array', async () => {
    const port = 8091;
    const path = '/test/webserver';

    const router = express.Router();
    router.route(path).get(async (req, res) => {
      console.log(`\nRoute path ${path} called\n`);
      res.status(200).json({ success: true });
      res.end();
    });

    let middlewares;
    let usersAuthMiddleware;

    // call
    const settings = { corsOrigins: [TestConstants.WebServer, `http://localhost:${port}`] };
    let web = await WebServer.init(port, router, middlewares, usersAuthMiddleware, settings);
    server = web?.server;

    // check
    chai.expect(web.app.mountpath).to.equal('/');

    let res = await supertest(`http://localhost:${port}`).get(`${path}`).set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({ success: true });
  }).timeout(10000);

  /**
   * web error
   */
  it('should web error', async () => {
    const port = 8091;
    const path = '/test/webserver';

    const router = express.Router();
    router.route(path).get(async (req, res) => {
      console.log(`\nRoute path ${path} called\n`);
      res.status(200).json({ success: true });
      res.end();
    });

    let middlewares;
    let authMiddlewares = [
      {
        middleware: sinon.stub().callsFake((req, res, next) => {
          console.log(`\nAuth Middleware0 called route ${JSON.stringify(req.route, null, 2)}\n`);
          throw new Error('Test error');
        }),
      },
    ];

    // call
    const settings = { corsOrigins: [TestConstants.WebServer, `http://localhost:${port}`] };
    let web = await WebServer.init(port, router, middlewares, authMiddlewares, settings);
    server = web?.server;

    // check
    chai.expect(web.app.mountpath).to.equal('/');

    let res = await supertest(`http://localhost:${port}`).get(`${path}`).set('Origin', TestConstants.WebServer);
    console.log(
      `\nTest returned: status=${JSON.stringify(res?.status, null, 2)}, ${JSON.stringify(res?.body, null, 2)}\n`
    );

    // check: the same answer as the controllers, a generic message and, in debug mode, the cause
    chai.expect(authMiddlewares[0].middleware.callCount).to.equal(1);
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.message).to.equal('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error');
  }).timeout(10000);

  /**
   * web error prod
   */
  it('should web error prod', async () => {
    const port = 8091;
    const path = '/test/webserver';

    // stub
    let stubDebug = sinon.stub(CommonUtils, 'isDebug').returns(false);

    const router = express.Router();
    router.route(path).get(async (req, res) => {
      console.log(`\nRoute path ${path} called\n`);
      res.status(200).json({ success: true });
      res.end();
    });

    let middlewares;
    let authMiddlewares = [
      {
        middleware: sinon.stub().callsFake((req, res, next) => {
          console.log(`\nAuth Middleware0 called route ${JSON.stringify(req.route, null, 2)}\n`);
          throw 'Test error';
        }),
      },
    ];

    // call
    const settings = { corsOrigins: [TestConstants.WebServer, `http://localhost:${port}`] };
    let web = await WebServer.init(port, router, middlewares, authMiddlewares, settings);
    server = web?.server;

    // check
    chai.expect(web.app.mountpath).to.equal('/');

    let res = await supertest(`http://localhost:${port}`).get(`${path}`).set('Origin', `http://localhost:${port}`);
    console.log(
      `\nTest returned: status=${JSON.stringify(res?.status, null, 2)}, ${JSON.stringify(res?.body, null, 2)}\n`
    );

    chai.expect(authMiddlewares[0].middleware.callCount).to.equal(1);
    chai.expect(stubDebug.callCount).to.be.greaterThanOrEqual(1);

    // check: in production only the generic message, never the cause
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body).to.deep.equal({ message: 'An unknown error has occured' });
  }).timeout(10000);

  /**
   * the auth middleware runs once, for the first matching route
   */
  it('should run the auth middleware once when a later route also matches', async () => {
    const port = 8091;

    // '/test/items/special' is also matched by '/test/items/:id', registered after it
    const router = express.Router();
    router.route('/test/items/special').get((req, res) => res.status(200).json({ route: 'special' }));
    router.route('/test/items/:id').get((req, res) => res.status(200).json({ route: 'id' }));

    const routes = [];
    const authMiddlewares = [
      sinon.stub().callsFake((req, res, next) => {
        routes.push(req.route.path);
        next();
      }),
    ];

    const settings = { corsOrigins: [TestConstants.WebServer, `http://localhost:${port}`] };
    let web = await WebServer.init(port, [router], [], authMiddlewares, settings);
    server = web?.server;

    let res = await supertest(`http://localhost:${port}`)
      .get('/test/items/special')
      .set('Origin', TestConstants.WebServer);
    chai.expect(res.body).to.deep.equal({ route: 'special' });
    chai.expect(routes).to.deep.equal(['/test/items/special']);

    res = await supertest(`http://localhost:${port}`).get('/test/items/abc').set('Origin', TestConstants.WebServer);
    chai.expect(res.body).to.deep.equal({ route: 'id' });
    chai.expect(routes).to.deep.equal(['/test/items/special', '/test/items/:id']);
  }).timeout(10000);

  /**
   * a web server without settings: no origin is allowed (CORS), the defaults of the limits and no trusted proxy
   */
  it('should refuse every origin without settings', async () => {
    const port = 8091;
    const router = express.Router();
    router.get('/test/no-settings', (req, res) => res.status(200).json({ success: true }));

    // call: no settings
    const web = await WebServer.init(port, [router]);
    server = web?.server;

    // check: refused for any origin
    const res = await supertest(`http://localhost:${port}`)
      .get('/test/no-settings')
      .set('Origin', TestConstants.WebServer);
    chai.expect(res.status).to.equal(500);
    chai.expect(web.app.get('trust proxy')).to.equal(false);
  }).timeout(10000);
});
