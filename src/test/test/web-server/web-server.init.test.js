const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const express = require('express');

const WebServer = require('../../../web-server/web-server.js');

describe('Web Server', function () {
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
   * init success
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

    // call
    let web = await WebServer.init(port);
    web.app.use(router);
    server = web?.server;

    // check
    chai.expect(web.app.mountpath).to.equal('/');

    let res = await chai.request(`http://localhost:${port}`).get(`${path}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({ success: true });
  }).timeout(10000);
});
