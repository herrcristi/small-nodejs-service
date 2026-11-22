const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

const RequestMiddleware = require('../../web-server/request.middleware.js');
const SanitizeMiddleware = require('../../web-server/sanitize.middleware.js');

describe('Sanitize Middleware', function () {
  let server = null;

  before(async function () {});

  beforeEach(async function () {});

  afterEach(function () {
    sinon.restore();
    server?.close();
  });

  after(async function () {});

  const start = () => {
    const app = express();
    app.use(bodyParser.json({ limit: '5mb' }));
    app.use(RequestMiddleware.middleware);
    app.use(SanitizeMiddleware.middleware);
    app.post('/test/body', (req, res) => res.status(200).json({ keys: Object.keys(req.body || {}) }));
    app.get('/test/body', (req, res) => res.status(200).json({ hasBody: req.body !== undefined }));
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
   * a change without a body gets an empty object (the validation of the service says what is missing); a read keeps no
   * body
   */
  it('should give an empty object to a change without a body', async () => {
    // call: a change without a body
    const res = await start().post('/test/body');

    // check: passed, with an empty object
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.keys).to.deep.equal([]);

    // case: a read is not changed
    const resGet = await start().get('/test/body');
    chai.expect(resGet.body).to.deep.equal({ hasBody: false });
  });

  /**
   * a body that was not parsed (another content type than JSON) is refused with 415, a body that is not a JSON object
   * (a list) with 400
   */
  it('should refuse a body that is not a JSON object', async () => {
    // call: an XML body (not parsed)
    const resXml = await start().post('/test/body').set('Content-Type', 'application/xml').send('<school/>');

    // check: the content type is not supported
    chai.expect(resXml.status).to.equal(415);
    chai.expect(resXml.body.detail).to.include('Request body must be JSON');

    // case: a JSON list
    const resList = await start().post('/test/body').set('Content-Type', 'application/json').send('[1,2]');
    chai.expect(resList.status).to.equal(400);
    chai.expect(resList.body.detail).to.equal('Request body must be a JSON object');
  });
});
