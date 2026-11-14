const sinon = require('sinon');
const chai = require('chai');

const HttpsMiddleware = require('../../web-server/https.middleware.js');

describe('Https Middleware', function () {
  afterEach(function () {
    sinon.restore();
  });

  const getReq = (headers) => ({
    url: '/api/v1/schools?limit=20',
    header: (name) => headers[name],
  });

  /**
   * a request that came over http is redirected to https
   */
  it('should redirect http requests to https', () => {
    const req = getReq({ 'x-forwarded-proto': 'http', host: 'small.example.test' });
    const res = { redirect: sinon.stub().returns('redirected') };
    const next = sinon.stub();

    const result = HttpsMiddleware.middleware(req, res, next);

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

    HttpsMiddleware.middleware(getReq({ 'x-forwarded-proto': 'https', host: 'small.example.test' }), res, next);

    chai.expect(res.redirect.callCount).to.equal(0);
    chai.expect(next.calledOnce).to.equal(true);
  });

  /**
   * a request without the forwarded protocol header (not behind a proxy) continues
   */
  it('should continue when there is no forwarded protocol', () => {
    const res = { redirect: sinon.stub() };
    const next = sinon.stub();

    HttpsMiddleware.middleware(getReq({ host: 'localhost' }), res, next);

    chai.expect(res.redirect.callCount).to.equal(0);
    chai.expect(next.calledOnce).to.equal(true);
  });
});
