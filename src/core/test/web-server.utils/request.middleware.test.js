const sinon = require('sinon');
const chai = require('chai');

const RequestMiddleware = require('../../web-server/request.middleware.js');

describe('Request Middleware', function () {
  afterEach(function () {
    sinon.restore();
  });

  const run = (headers) => {
    const req = {
      headers,
      method: 'get',
      path: '/api/v1/students',
      originalUrl: '/api/v1/students?limit=1',
      socket: { remoteAddress: '10.0.0.1' },
    };
    const res = { on: sinon.stub() };
    const next = sinon.stub();
    RequestMiddleware.middleware(req, res, next);
    chai.expect(next.calledOnce).to.equal(true);
    return req._ctx;
  };

  /**
   * well formed values are kept
   */
  it('should keep well formed tenant, request id and language', async () => {
    const ctx = run({ 'x-tenant-id': 'C837AA4179CB45CDBF7D9AF5DAFFB59D', 'x-request-id': 'req-1', 'x-lang': 'ro' });

    chai.expect(ctx.tenantID).to.equal('C837AA4179CB45CDBF7D9AF5DAFFB59D');
    chai.expect(ctx.reqID).to.equal('req-1');
    chai.expect(ctx.lang).to.equal('ro');
    chai.expect(ctx.reqUrl).to.equal('/api/v1/students?limit=1');
  });

  /**
   * values that are not well formed are dropped
   */
  it('should drop a tenant that is not a plain id, and use safe defaults', async () => {
    // a pattern as tenant, a request id with spaces and a new line, a language with a suffix
    const ctx = run({ 'x-tenant-id': '(a+)+$', 'x-request-id': 'a b\nc', 'x-lang': 'en; drop' });

    // check: no tenant, a new request id, the default language
    chai.expect(ctx.tenantID).to.equal(undefined);
    chai.expect(ctx.reqID).to.match(/^[A-Za-z0-9-]+$/);
    chai.expect(ctx.reqID).to.not.equal('a b\nc');
    chai.expect(ctx.lang).to.equal('en');

    // two tenants, or none: no tenant
    chai.expect(run({ 'x-tenant-id': 'school-a, school-b' }).tenantID).to.equal(undefined);
    chai.expect(run({}).tenantID).to.equal(undefined);
  });

  /**
   * who the caller is never comes from the headers of the request
   */
  it('should not take the user from the headers', async () => {
    const ctx = run({ 'x-user-id': 'ID-OF-PRINCIPAL', 'x-user-name': 'principal@b.test', 'x-tenant-name': 'Other' });

    chai.expect(ctx.userID).to.equal(undefined);
    chai.expect(ctx.username).to.equal(undefined);
    chai.expect(ctx.tenantName).to.equal(undefined);
  });
});
