/**
 * Users auth setup service
 */
const UsersRest = require('../rest/users.rest.js');
const UsersAuthSignupService = require('./users-auth.signup.service.js');

const Public = {
  /**
   * bootstrap the portal admin
   *
   * if the Portal School has no portal admin that can work (the portal-admin role and an active account) and
   * SMALL_API_PORTAL_ADMIN_EMAIL is set, that email is invited to the Portal School with the portal-admin role, using
   * the same invite flow as any other invitation: a new user gets the signup/password setup email, so no password is
   * ever configured. It is repeated at every start until a portal admin is active, and the invite repairs what is
   * left: a pending user gets a new setup link (the first email was lost, or the address was wrong and is corrected),
   * an invite interrupted after the user was created gets its auth record. A former portal admin (the role removed, also
   * by itself) and a disabled one do not count, so a portal left without a portal admin gets the configured one again.
   * It does nothing while an active portal admin exists, so it is safe on every start.
   * Must run after the Portal School is created (SchoolsSetupService.init).
   */
  init: async () => {
    const portalSchoolID = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    const _ctx = { reqID: 'UsersAuthSetup', lang: 'en', tenantID: portalSchoolID, tenantName: 'Portal School' };

    const email = process.env.SMALL_API_PORTAL_ADMIN_EMAIL;
    if (!email) {
      return false;
    }

    // a portal admin that can work: the role on the portal school and an active account
    const rActive = await UsersRest.getPortalAdmins('status=active&limit=1&projection=id', _ctx);
    if (rActive.error) {
      throw new Error(rActive.error.message || 'Failed to check the portal admins');
    }
    if (rActive.value?.data?.length) {
      return false;
    }

    // none: the configured email is invited (or its invite is repaired)
    const invited = await UsersAuthSignupService.invite(
      { email, school: { role: UsersRest.Constants.Roles.PortalAdmin } },
      _ctx
    );
    if (invited.error) {
      throw new Error(invited.error.message || 'Failed to invite the first portal admin');
    }

    // the email could not be sent: a clear error (it is sent again at the next start)
    if (!invited.emailSent) {
      console.error(
        `\nThe invitation of the portal admin ${email} could not be sent: check the mail settings (SMALL_API_SMTP_CONFIG). ` +
          'It is sent again at the next start.'
      );
      return true;
    }

    console.log(`\nInvited the portal admin ${email}`);
    return true;
  },
};

module.exports = { ...Public };
