/**
 * Users auth setup service
 */
const UsersRest = require('../rest/users.rest.js');
const UsersAuthSignupService = require('./users-auth.signup.service.js');

const Public = {
  /**
   * bootstrap the first portal admin
   *
   * if the Portal School has no portal admin yet and SMALL_API_PORTAL_ADMIN_EMAIL is set, that email is invited to the
   * Portal School with the portal-admin role, using the same invite flow as any other invitation:
   * a new user gets the signup/password setup email, so no password is ever configured.
   * It does nothing when a portal admin already exists, so it is safe to run on every startup.
   * Must run after the Portal School is created (SchoolsSetupService.init).
   */
  init: async () => {
    const email = process.env.SMALL_API_PORTAL_ADMIN_EMAIL;
    if (!email) {
      return false;
    }

    const portalSchoolID = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    const _ctx = { reqID: 'UsersAuthSetup', lang: 'en', tenantID: portalSchoolID, tenantName: 'Portal School' };

    // only the portal admins are members of the portal school
    const schoolParam = encodeURIComponent(portalSchoolID);
    const existing = await UsersRest.getAll(`schools.id=${schoolParam}&limit=1&projection=id`, _ctx);
    if (existing.error) {
      throw new Error(existing.error.message || 'Failed to check the portal admins');
    }
    if (existing.value?.length) {
      return false;
    }

    const invited = await UsersAuthSignupService.invite(
      { email, school: { role: UsersRest.Constants.Roles.PortalAdmin } },
      _ctx
    );
    if (invited.error) {
      throw new Error(invited.error.message || 'Failed to invite the first portal admin');
    }

    console.log(`\nInvited the first portal admin ${email}`);
    return true;
  },
};

module.exports = { ...Public };
