const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

const RequestMiddleware = require('../../web-server/request.middleware.js');
const SanitizeMiddleware = require('../../web-server/sanitize.middleware.js');

describe('Sanitize Middleware', function () {
  let server = null;

  afterEach(function () {
    sinon.restore();
    server?.close();
  });

  const start = () => {
    const app = express();
    app.use(bodyParser.json({ limit: '5mb' }));
    app.use(RequestMiddleware.middleware);
    app.use(SanitizeMiddleware.middleware);
    app.post('/test/body', (req, res) => res.status(200).json({ keys: Object.keys(req.body || {}) }));
    server = app.listen(0);
    return supertest(server);
  };

  /**
   * a clean body passes
   */
  it('should let a clean body pass', async () => {
    // call with a normal body
    const res = await start()
      .post('/test/body')
      .set('Content-Type', 'application/json')
      .send('{"name":"x","a":{"b":[1,2]}}');

    // check: passed, with its keys
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.keys).to.deep.equal(['name', 'a']);
  });

  /**
   * keys that change the prototype are refused
   */
  it('should refuse a body with keys that change the prototype', async () => {
    // __proto__, constructor and prototype, also nested in a list
    for (const body of [
      '{"name":"x","__proto__":{"id":"inherited"}}',
      '{"a":[{"b":{"constructor":{"prototype":{}}}}]}',
      '{"prototype":1}',
    ]) {
      const res = await start().post('/test/body').set('Content-Type', 'application/json').send(body);

      // check: refused
      chai.expect(res.status, body).to.equal(400);
      chai.expect(JSON.stringify(res.body)).to.include('forbidden key');
    }
  });

  /**
   * a body nested too deep is refused (it is never valid and can overflow the stack of the code that follows)
   */
  it('should refuse a body that is nested too deep', async () => {
    const body = '{"a":'.repeat(2000) + '1' + '}'.repeat(2000);
    const res = await start().post('/test/body').set('Content-Type', 'application/json').send(body);

    chai.expect(res.status).to.equal(400);
    chai.expect(JSON.stringify(res.body)).to.include('nested too deep');
  });

  /**
   * no body
   */
  it('should let a request without a body pass', async () => {
    const res = await start().post('/test/body');

    chai.expect(res.status).to.equal(200);
  });
});
