const sinon = require('sinon');
const chai = require('chai');

const HttpsMiddleware = require('../../web-server/https.middleware.js');

describe('Https Middleware', function () {
  before(async function () {});

  beforeEach(async function () {});

  afterEach(function () {
    sinon.restore();
  });

  after(async function () {});

  const getReq = (headers) => ({
    url: '/api/v1/schools?limit=20',
    header: (name) => headers[name],
  });

  /**
   * a request that came over http is redirected to https
   */
  it('should redirect http requests to https', () => {
    // a request that came over http
    const req = getReq({ 'x-forwarded-proto': 'http', host: 'small.example.test' });
    const res = { redirect: sinon.stub().returns('redirected') };
    const next = sinon.stub();

    // call
    const result = HttpsMiddleware.middleware(req, res, next);

    // check: redirected to the same url over https, not continued
    chai
      .expect(res.redirect.calledOnceWithExactly('https://small.example.test/api/v1/schools?limit=20'))
      .to.equal(true);
    chai.expect(next.callCount).to.equal(0);
    chai.expect(result).to.equal('redirected');
  });

  /**
   * a request that came over https continues
   */
  it('should continue for https requests', () => {
    const res = { redirect: sinon.stub() };
    const next = sinon.stub();

    // call with a request that came over https
    HttpsMiddleware.middleware(getReq({ 'x-forwarded-proto': 'https', host: 'small.example.test' }), res, next);

    // check: continued, not redirected
    chai.expect(res.redirect.callCount).to.equal(0);
    chai.expect(next.calledOnce).to.equal(true);
  });

  /**
   * a request without the forwarded protocol header (not behind a proxy) continues
   */
  it('should continue when there is no forwarded protocol', () => {
    const res = { redirect: sinon.stub() };
    const next = sinon.stub();

    // call without the forwarded protocol
    HttpsMiddleware.middleware(getReq({ host: 'localhost' }), res, next);

    // check: continued, not redirected
    chai.expect(res.redirect.callCount).to.equal(0);
    chai.expect(next.calledOnce).to.equal(true);
  });
});
