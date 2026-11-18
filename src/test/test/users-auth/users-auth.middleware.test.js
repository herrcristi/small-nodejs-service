const sinon = require('sinon');
const chai = require('chai');

const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const UsersAuthMiddleware = require('../../../services/users-auth/users-auth.middleware.js');

describe('Users Auth Middleware', function () {
  afterEach(function () {
    sinon.restore();
  });

  const getReq = (path, tenantID) => ({
    route: { path },
    method: 'GET',
    cookies: {},
    _ctx: { reqID: 'testReq', lang: 'en', tenantID },
  });

  /**
   * the routes without authentication do not keep a tenant that nobody verified
   */
  it('should not keep the tenant on a route without authentication', async () => {
    // each route without authentication, called with a tenant
    for (const path of [
      '/api/v1/users-auth/login',
      '/api/v1/users-auth/me',
      '/api/v1/users-auth/reset-password',
      '/api/v1/users-auth/reset-token/validate',
      '/api/v1/users-auth/reset-token/password',
    ]) {
      const req = getReq(path, 'school-b');
      const next = sinon.stub();

      // call
      await UsersAuthMiddleware.middleware(req, {}, next);

      // check: continued, without the tenant
      chai.expect(next.calledOnce, path).to.equal(true);
      chai.expect(req._ctx.tenantID, path).to.equal(undefined);
    }
  });

  /**
   * an authenticated route keeps the tenant (it is checked by the validation)
   */
  it('should keep the tenant on an authenticated route', async () => {
    // stub: a valid session
    const stubValidate = sinon
      .stub(UsersAuthRest, 'validate')
      .resolves({ status: 200, value: { userID: 'user1', username: 'user@test.test', tenantName: 'School A' } });
    const req = getReq('/api/v1/students', 'school-a');
    const next = sinon.stub();

    // call
    await UsersAuthMiddleware.middleware(req, {}, next);

    // check: validated, the tenant and the user are in the context
    chai.expect(stubValidate.calledOnce).to.equal(true);
    chai.expect(next.calledOnce).to.equal(true);
    chai.expect(req._ctx.tenantID).to.equal('school-a');
    chai.expect(req._ctx.userID).to.equal('user1');
    chai.expect(req._ctx.tenantName).to.equal('School A');
  });
});
