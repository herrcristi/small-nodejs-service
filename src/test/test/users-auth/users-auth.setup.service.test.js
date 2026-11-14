const chai = require('chai');
const sinon = require('sinon');

const TestConstants = require('../../test-constants.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const UsersAuthSetupService = require('../../../services/users-auth/users-auth.setup.service.js');
const UsersAuthSignupService = require('../../../services/users-auth/users-auth.signup.service.js');

describe('Users Auth Setup Service', function () {
  const email = 'first.portal.admin@testdomain.test';
  let previousEmail;

  beforeEach(function () {
    previousEmail = process.env.SMALL_API_PORTAL_ADMIN_EMAIL;
    process.env.SMALL_API_PORTAL_ADMIN_EMAIL = email;
  });

  afterEach(function () {
    sinon.restore();
    if (previousEmail === undefined) {
      delete process.env.SMALL_API_PORTAL_ADMIN_EMAIL;
    } else {
      process.env.SMALL_API_PORTAL_ADMIN_EMAIL = previousEmail;
    }
  });

  /**
   * nothing configured
   */
  it('does nothing when no first portal admin email is configured', async () => {
    delete process.env.SMALL_API_PORTAL_ADMIN_EMAIL;
    const stubGetAll = sinon.stub(UsersRest, 'getAll');
    const stubInvite = sinon.stub(UsersAuthSignupService, 'invite');

    chai.expect(await UsersAuthSetupService.init()).to.equal(false);
    chai.expect(stubGetAll.callCount).to.equal(0);
    chai.expect(stubInvite.callCount).to.equal(0);
  });

  /**
   * no portal admin yet
   */
  it('invites the configured email as portal admin when there is none', async () => {
    const stubGetAll = sinon.stub(UsersRest, 'getAll').resolves({ status: 200, value: [] });
    const stubInvite = sinon.stub(UsersAuthSignupService, 'invite').resolves({ status: 201, value: {} });

    chai.expect(await UsersAuthSetupService.init()).to.equal(true);

    chai
      .expect(stubGetAll.firstCall.args[0])
      .to.equal(`schools.id=${TestConstants.PortalSchoolID}&limit=1&projection=id`);
    chai.expect(stubInvite.calledOnce).to.equal(true);
    chai.expect(stubInvite.firstCall.args[0]).to.deep.equal({
      email,
      school: { role: UsersRest.Constants.Roles.PortalAdmin },
    });
    chai.expect(stubInvite.firstCall.args[1].tenantID).to.equal(TestConstants.PortalSchoolID);
  });

  /**
   * already has a portal admin
   */
  it('does not invite again when a portal admin already exists', async () => {
    sinon.stub(UsersRest, 'getAll').resolves({ status: 200, value: [{ id: 'user1' }] });
    const stubInvite = sinon.stub(UsersAuthSignupService, 'invite');

    chai.expect(await UsersAuthSetupService.init()).to.equal(false);
    chai.expect(stubInvite.callCount).to.equal(0);
  });

  /**
   * failures stop the startup, the operator must fix the configuration
   */
  it('fails when the portal admins cannot be checked', async () => {
    sinon.stub(UsersRest, 'getAll').resolves({ status: 500, error: { message: 'db down' } });
    const stubInvite = sinon.stub(UsersAuthSignupService, 'invite');

    let error = null;
    try {
      await UsersAuthSetupService.init();
    } catch (e) {
      error = e;
    }
    chai.expect(error?.message).to.equal('db down');
    chai.expect(stubInvite.callCount).to.equal(0);
  });

  it('fails when the invitation fails', async () => {
    sinon.stub(UsersRest, 'getAll').resolves({ status: 200, value: [] });
    sinon.stub(UsersAuthSignupService, 'invite').resolves({ status: 400, error: { message: 'bad email' } });

    let error = null;
    try {
      await UsersAuthSetupService.init();
    } catch (e) {
      error = e;
    }
    chai.expect(error?.message).to.equal('bad email');
  });
});
