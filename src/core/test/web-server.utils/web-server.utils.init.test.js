const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const express = require('express');

const WebServer = require('../../web-server/web-server.utils.js');

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
    const port = 8081;
    const path = '/test/webserver';

    const router = express.Router();
    router.route(path).get(async (req, res) => {
      console.log(`\nRoute path ${path} called\n`);
      res.status(200).json({ success: true });
      res.end();
    });

    let middlewares = [
      {
        middleware: (req, res, next) => {
          console.log(`\nMiddleware1 called\n`);
          next();
        },
      },
      (req, res, next) => {
        console.log(`\nMiddleware2 called\n`);
        next();
      },
    ];

    // call
    let web = await WebServer.init(port, [router], middlewares, _ctx);
    server = web?.server;

    // check
    chai.expect(web.app.mountpath).to.equal('/');

    let res = await chai.request(`http://localhost:${port}`).get(`${path}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({ success: true });
  }).timeout(10000);

  /**
   * init route is not array
   */
  it('should init route is not array', async () => {
    const port = 8081;
    const path = '/test/webserver';

    const router = express.Router();
    router.route(path).get(async (req, res) => {
      console.log(`\nRoute path ${path} called\n`);
      res.status(200).json({ success: true });
      res.end();
    });

    let middlewares;

    // call
    let web = await WebServer.init(port, router, middlewares, _ctx);
    server = web?.server;

    // check
    chai.expect(web.app.mountpath).to.equal('/');

    let res = await chai.request(`http://localhost:${port}`).get(`${path}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({ success: true });
  }).timeout(10000);

  /**
   * init fail server closed
   */
  it('should init fail server closed', async () => {
    const port = 8081;
    const path = '/test/webserver';

    const router = express.Router();
    router.route(path).get(async (req, res) => {
      console.log(`\nRoute path ${path} called\n`);
      res.status(200).json({ success: true });
      res.end();
    });

    let middlewares;

    // call
    let web = await WebServer.init(port, router, middlewares, _ctx);
    server = web?.server;

    // check
    chai.expect(web.app.mountpath).to.equal('/');
    server.close();

    let hasException = false;
    try {
      let res = await chai.request(`http://localhost:${port}`).get(`${path}`);
      console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);
    } catch (e) {
      console.log(`\nTest exception: ${e.stack ? e.stack : e}\n`);
      chai.expect(e.message).to.include('ECONNREFUSED');
      hasException = true;
    }

    chai.expect(hasException).to.equal(true);
  }).timeout(10000);
});
