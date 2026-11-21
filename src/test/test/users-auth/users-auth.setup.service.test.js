const chai = require('chai');
const sinon = require('sinon');

const TestConstants = require('../../test-constants.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const UsersAuthSetupService = require('../../../services/users-auth/users-auth.setup.service.js');
const UsersAuthSignupService = require('../../../services/users-auth/users-auth.signup.service.js');

describe('Users Auth Setup Service', function () {
  const email = 'first.portal.admin@testdomain.test';
  let previousEmail;

  /**
   * the init must throw: returns the error
   */
  const initError = async () => {
    try {
      await UsersAuthSetupService.init();
    } catch (e) {
      return e;
    }
    return null;
  };

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
   * nothing configured: nothing is checked
   */
  it('does not invite when no portal admin email is configured', async () => {
    // stub: no email
    delete process.env.SMALL_API_PORTAL_ADMIN_EMAIL;
    const stubAdmins = sinon.stub(UsersRest, 'getPortalAdmins');
    const stubInvite = sinon.stub(UsersAuthSignupService, 'invite');

    // call: nothing done
    chai.expect(await UsersAuthSetupService.init()).to.equal(false);

    // check: no portal admin read, nobody invited
    chai.expect(stubAdmins.callCount).to.equal(0);
    chai.expect(stubInvite.callCount).to.equal(0);
  });

  /**
   * no active portal admin: the configured email is invited
   */
  it('invites the configured email when no portal admin is active', async () => {
    // stub: no active portal admin (none, a former one, or only a disabled one); the invite
    const stubAdmins = sinon.stub(UsersRest, 'getPortalAdmins').resolves({ status: 200, value: { data: [] } });
    const invited = { status: 201, value: {} };
    const stubInvite = sinon.stub(UsersAuthSignupService, 'invite').resolves(invited);

    // call: invited
    chai.expect(await UsersAuthSetupService.init()).to.equal(true);

    // check: only the active portal admins count; the email invited as portal admin of the portal school
    chai.expect(stubAdmins.firstCall.args[0]).to.equal('status=active&limit=1&projection=id');
    chai.expect(stubAdmins.firstCall.args[1].tenantID).to.equal(TestConstants.PortalSchoolID);
    chai.expect(stubInvite.firstCall.args[0]).to.deep.equal({
      email,
      school: { role: UsersRest.Constants.Roles.PortalAdmin },
    });
    chai.expect(stubInvite.firstCall.args[1].tenantID).to.equal(TestConstants.PortalSchoolID);
  });

  /**
   * an active portal admin exists: nothing to do
   */
  it('does not invite when a portal admin is active', async () => {
    // stub: an active portal admin; no invite is expected
    sinon.stub(UsersRest, 'getPortalAdmins').resolves({ status: 200, value: { data: [{ id: 'user1' }] } });
    const stubInvite = sinon.stub(UsersAuthSignupService, 'invite');

    // call and check: nobody invited
    chai.expect(await UsersAuthSetupService.init()).to.equal(false);
    chai.expect(stubInvite.callCount).to.equal(0);
  });

  /**
   * failures stop the startup, the operator must fix the configuration
   */
  it('fails when the portal admins can not be checked or the invitation fails', async () => {
    // stub: the portal admins can not be read
    const stubAdmins = sinon
      .stub(UsersRest, 'getPortalAdmins')
      .resolves({ status: 500, error: { message: 'db down' } });
    const stubInvite = sinon.stub(UsersAuthSignupService, 'invite');

    // case: the active portal admins can not be read: the error, nobody invited
    chai.expect((await initError())?.message).to.equal('db down');
    chai.expect(stubInvite.callCount).to.equal(0);
    stubAdmins.resolves({ status: 500, error: {} });
    chai.expect((await initError())?.message).to.equal('Failed to check the portal admins');

    // case: the invite fails (an invalid email): the error
    stubAdmins.resolves({ status: 200, value: { data: [] } });
    stubInvite.resolves({ status: 400, error: { message: 'bad email' } });
    chai.expect((await initError())?.message).to.equal('bad email');
    stubInvite.resolves({ status: 500, error: {} });
    chai.expect((await initError())?.message).to.equal('Failed to invite the first portal admin');
  });
});
