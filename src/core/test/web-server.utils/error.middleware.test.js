const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

const CommonUtils = require('../../utils/common.utils.js');
const RequestMiddleware = require('../../web-server/request.middleware.js');
const ErrorMiddleware = require('../../web-server/error.middleware.js');

describe('Error Middleware', function () {
  let server = null;

  afterEach(function () {
    sinon.restore();
    server?.close();
  });

  const start = () => {
    const app = express();
    app.use(bodyParser.json({ limit: '1kb' }));
    app.use(RequestMiddleware.middleware);
    app.post('/test/body', (req, res) => res.status(200).json({ name: req.body?.name }));
    app.get('/test/failure', () => {
      throw new Error('Connection to the database lost at db-1.internal');
    });
    app.use(ErrorMiddleware.middleware);
    server = app.listen(0);
    return supertest(server);
  };

  /**
   * a body that is not JSON: 400 with the reason, the same answer as the controllers
   */
  it('should answer 400 with the reason for a body that is not JSON', async () => {
    // stub: production (no debug details)
    sinon.stub(CommonUtils, 'isDebug').returns(false);

    // call with a broken body
    const res = await start().post('/test/body').set('Content-Type', 'application/json').send('{"name":');

    // check: the generic message and the reason as text (not an object)
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.message).to.equal('Request is not valid');
    chai.expect(res.body.detail).to.be.a('string').and.not.be.empty;
    chai.expect(res.body.error).to.equal(undefined);
  });

  /**
   * a body that is too large: its status, without details in production
   */
  it('should answer 413 for a body that is too large', async () => {
    // stub: production
    sinon.stub(CommonUtils, 'isDebug').returns(false);

    // call with a body over the limit (1kb)
    const name = 'a'.repeat(2000);
    const res = await start().post('/test/body').set('Content-Type', 'application/json').send({ name });

    // check: the status of the error, a generic message only
    chai.expect(res.status).to.equal(413);
    chai.expect(Object.keys(res.body)).to.deep.equal(['message']);
  });

  /**
   * an exception: 500 without its cause in production
   */
  it('should answer 500 without the cause of an exception in production', async () => {
    // stub: production
    sinon.stub(CommonUtils, 'isDebug').returns(false);

    // call a route that throws
    const res = await start().get('/test/failure');

    // check: the generic message; the cause (an internal address) is not sent
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body).to.deep.equal({ message: 'An unknown error has occured' });
    chai.expect(JSON.stringify(res.body)).to.not.include('db-1.internal');
  });

  /**
   * an exception in debug mode: the cause is sent, for the developer
   */
  it('should send the cause of an exception in debug mode', async () => {
    // stub: debug mode
    sinon.stub(CommonUtils, 'isDebug').returns(true);

    // call a route that throws
    const res = await start().get('/test/failure');

    // check: the generic message and the stack
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.message).to.equal('An unknown error has occured');
    chai.expect(res.body.error).to.include('db-1.internal');
  });
});
