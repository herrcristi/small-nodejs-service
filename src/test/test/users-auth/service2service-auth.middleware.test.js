const sinon = require('sinon');
const chai = require('chai');

const RestCommsUtils = require('../../../core/utils/rest-communications.utils.js');
const RequestMiddleware = require('../../../core/web-server/request.middleware.js');
const Service2ServiceAuthMiddleware = require('../../../services/users-auth/service2service-auth.middleware.js');

describe('Service 2 Service Auth Middleware', function () {
  afterEach(function () {
    sinon.restore();
  });

  /**
   * build the context like the server does (request middleware first), from the headers of a call
   */
  const getReq = (path, headers) => {
    const req = {
      headers,
      method: 'get',
      path,
      originalUrl: path,
      route: { path },
      socket: { remoteAddress: '10.0.0.1' },
    };
    RequestMiddleware.middleware(req, { on: sinon.stub() }, sinon.stub());
    return req;
  };

  /**
   * a call without a service token on a public route is not a service call: nothing is validated or taken from headers
   */
  it('should not take the identity or the tenant name from the headers of a normal request', async () => {
    const stubValidation = sinon.stub(RestCommsUtils, 'restValidation');
    const req = getReq('/api/v1/students', {
      'x-user-id': 'ID-OF-OTHER-USER',
      'x-user-name': 'other.user@testdomain.test',
      'x-tenant-name': 'Some School',
    });
    const next = sinon.stub();

    await Service2ServiceAuthMiddleware.middleware(req, {}, next);

    chai.expect(stubValidation.callCount).to.equal(0);
    chai.expect(next.calledOnce).to.equal(true);
    chai.expect(req._ctx.userID).to.equal(undefined);
    chai.expect(req._ctx.username).to.equal(undefined);
    chai.expect(req._ctx.tenantName).to.equal(undefined);
  });

  /**
   * a service call: the identity comes from the signed service token, not from the headers next to it
   */
  it('should take the identity and the tenant from the service token and not from the headers', async () => {
    const stubValidation = sinon.stub(RestCommsUtils, 'restValidation').callsFake((token, ctx) => {
      // what the validation of the signed token does (see restValidation)
      ctx.tenantID = 'school-a';
      ctx.userID = 'user-1';
      ctx.username = 'user.one@testdomain.test';
      ctx.tenantName = 'School A';
      return { status: 200, value: {} };
    });
    const req = getReq('/api/internal_v1/users', {
      'x-s2s-token': 'token',
      'x-tenant-id': 'school-b',
      'x-user-id': 'ID-OF-OTHER-USER',
      'x-user-name': 'other.user@testdomain.test',
      'x-tenant-name': 'Some School',
    });
    const next = sinon.stub();

    await Service2ServiceAuthMiddleware.middleware(req, {}, next);

    chai.expect(stubValidation.calledOnce).to.equal(true);
    chai.expect(next.calledOnce).to.equal(true);
    chai.expect(req._ctx.tenantID).to.equal('school-a');
    chai.expect(req._ctx.userID).to.equal('user-1');
    chai.expect(req._ctx.username).to.equal('user.one@testdomain.test');
    chai.expect(req._ctx.tenantName).to.equal('School A');
  });

  /**
   * an internal route without a valid service token is refused
   */
  it('should refuse an internal route without a valid service token', async () => {
    sinon.stub(RestCommsUtils, 'restValidation').returns({
      status: 401,
      error: { message: 'Invalid token', error: new Error('Invalid token') },
    });
    const req = getReq('/api/internal_v1/users', { 'x-user-id': 'ID-OF-OTHER-USER' });
    const res = { status: sinon.stub().returnsThis(), json: sinon.stub(), end: sinon.stub() };
    const next = sinon.stub();

    await Service2ServiceAuthMiddleware.middleware(req, res, next);

    chai.expect(next.callCount).to.equal(0);
    chai.expect(res.status.calledWith(401)).to.equal(true);
    chai.expect(req._ctx.userID).to.equal(undefined);
  });

  /**
   * the internal routes are served only when the services run in separate processes
   */
  it('should answer not found on the internal routes unless they are enabled', async () => {
    const stubValidation = sinon.stub(RestCommsUtils, 'restValidation').returns({ status: 200, value: {} });
    const previous = process.env.SMALL_API_INTERNAL_ROUTES;
    const call = async () => {
      const req = getReq('/api/internal_v1/users', { 'x-s2s-token': 'token' });
      const res = { status: sinon.stub().returnsThis(), json: sinon.stub().returnsThis(), end: sinon.stub() };
      const next = sinon.stub();
      await Service2ServiceAuthMiddleware.middleware(req, res, next);
      return { res, next };
    };

    try {
      // not enabled (one process): 404, the token is not even checked
      for (const value of [undefined, 'false', '1']) {
        if (value === undefined) {
          delete process.env.SMALL_API_INTERNAL_ROUTES;
        } else {
          process.env.SMALL_API_INTERNAL_ROUTES = value;
        }
        const { res, next } = await call();
        chai.expect(res.status.firstCall.args[0]).to.equal(404);
        chai.expect(next.callCount).to.equal(0);
      }
      chai.expect(stubValidation.callCount).to.equal(0);

      // enabled: the service token is checked
      process.env.SMALL_API_INTERNAL_ROUTES = 'true';
      const { next } = await call();
      chai.expect(stubValidation.callCount).to.equal(1);
      chai.expect(next.callCount).to.equal(1);
    } finally {
      if (previous === undefined) {
        delete process.env.SMALL_API_INTERNAL_ROUTES;
      } else {
        process.env.SMALL_API_INTERNAL_ROUTES = previous;
      }
    }
  });
});
