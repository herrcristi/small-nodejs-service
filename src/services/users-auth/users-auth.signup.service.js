/**
 * Users service
 */

const Joi = require('joi');

const DbOpsUtils = require('../../core/utils/db-ops.utils.js');
const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const ValidationUtils = require('../../core/utils/validation.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const EventsRest = require('../rest/events.rest.js');
const UsersRest = require('../rest/users.rest.js');
const SchoolsRest = require('../rest/schools.rest.js');
const StudentsRest = require('../rest/students.rest.js');
const ProfessorsRest = require('../rest/professors.rest.js');
const AdminsRest = require('../rest/admins.rest.js');
const UsersAuth = require('./users-auth.service.js');

const UsersAuthConstants = require('./users-auth.constants.js');

/**
 * validation
 */
const Schema = {
  Signup: Joi.object().keys({
    email: ValidationUtils.email(),
    school: Joi.object().keys({
      name: Joi.string().trim().min(1).max(64).required(), // without the spaces around it (only spaces: refused)
      description: Joi.string().min(0).max(1024).allow(null),
    }),
  }),
  Invite: Joi.object().keys({
    email: ValidationUtils.email(),
    school: Joi.object().keys({
      id: Joi.string().pattern(ValidationUtils.IDPattern), // only a portal admin, to invite the admin of a school
      role: Joi.string()
        .min(1)
        .max(64)
        .valid(...Object.values(UsersRest.Constants.Roles))
        .required(),
    }),
  }),
};

const Validators = {
  Signup: Schema.Signup.fork(['email', 'school'], (x) => x.required() /*make required */),

  Invite: Schema.Invite.fork(['email', 'school'], (x) => x.required() /*make required */),
};

const Private = {
  Action: {
    Signup: 'signup',
    Invite: 'invite',
  },

  /**
   * the context of another school where a portal admin invites an admin (school.id), like the first admin at signup
   * an invite is for the selected school (a school admin invites into its own school, any role of that school);
   * only a portal admin (on the portal school) names another school, and only for the admin role
   * returns { status, value: _ctx of the school } or { status, error }
   */
  getSchoolCtxForPortalInvite: async (objInfo, _ctx) => {
    const portalSchoolID = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    if (!portalSchoolID || _ctx.tenantID !== portalSchoolID) {
      const msg = 'An invitation is for the selected school; only a portal admin can name another school';
      return { status: 403, error: { message: msg, error: new Error(msg) } };
    }

    const schoolID = objInfo.school.id;
    if (objInfo.school.role !== UsersRest.Constants.Roles.Admin) {
      const msg = 'A portal admin invites only the admins of a school';
      return { status: 400, error: { message: msg, error: new Error(msg) } };
    }

    const rSchool = await SchoolsRest.getOne(schoolID, { id: 1, name: 1 }, _ctx);
    if (rSchool.error) {
      return rSchool;
    }

    return { status: 200, value: { ..._ctx, tenantID: schoolID, tenantName: rSchool.value.name } };
  },

  /**
   * link the traces of a deleted account with this email in the school (its students, professors and admins, whatever
   * the invited role) to the user: done once, at the invite (the only way into a school), before the user gets its role,
   * so the users notifications find them by the id of the user
   * a failure is logged and the next services are still done; the first failure is returned at the end
   * returns { status, value } or { status, error }
   */
  relinkTraces: async (email, userID, _ctx) => {
    let failure = null; // the first failure (the next services are still done)
    for (const membersRest of [StudentsRest, ProfessorsRest, AdminsRest]) {
      const r = await membersRest.relinkTraces({ email, userID }, _ctx);
      if (r.error) {
        console.log(`\n${UsersAuthConstants.ServiceName}: failed to link the traces of ${email}: ${r.error.message}`);
        failure ??= r;
      }
    }
    return failure || { status: 200, value: true };
  },

  /**
   * create new user
   * objInfo: { email, school: { role } }
   */
  postNewUser: async (objInfo, _ctx) => {
    // a new id, given here: the traces of a deleted account with this email are linked to it before the user exists
    const newID = CommonUtils.uuidc();
    const rLink = await Private.relinkTraces(objInfo.email, newID, _ctx);
    if (rLink.error) {
      return rLink;
    }

    // create first user details (with default status pending)
    const userInfo = {
      id: newID,
      email: objInfo.email,
      schools: [
        {
          id: _ctx.tenantID, // schoolID
          roles: [objInfo.school.role],
        },
      ],
    };
    const rUser = await UsersRest.post(userInfo, _ctx);
    if (rUser.error) {
      return rUser;
    }

    const userID = rUser.value.id;

    // create user auth with a random password
    const rAuth = await UsersAuth.post(
      {
        username: objInfo.email,
        password: CommonUtils.getRandomBytes(30).toString('hex') + 'aA1!', // random password with complexity rules
        userID: userID,
      },
      _ctx
    );
    if (rAuth.error) {
      // delete previous added user
      await UsersRest.delete(userID, _ctx);

      return rAuth;
    }

    // success { status:201, value: { id, name, type, userID } }
    return rAuth;
  },

  /**
   * invite an existing user: the role is added (if not there yet); an invite interrupted after the user was created
   * is completed (its missing auth record is created)
   * userInfo: { id, name, email, status, schools: [ { id, roles } ] }
   * objInfo: { email, school: { role } }
   * returns { status, value, needsSetup } or { status, error }; needsSetup: the user has not set a password yet
   * (pending, or its auth record was just created), so it gets the setup link and not the invitation
   */
  inviteExistingUser: async (userInfo, objInfo, _ctx) => {
    // the traces of a deleted account with this email, before the user gets its role
    const rLink = await Private.relinkTraces(objInfo.email, userInfo.id, _ctx);
    if (rLink.error) {
      return rLink;
    }

    // the auth record (created when it is missing)
    const authInfo = { username: objInfo.email, userID: userInfo.id };
    const rAuth = await UsersAuth.ensureAuth(authInfo, _ctx);
    if (rAuth.error) {
      return rAuth;
    }

    // the role
    const rRole = await Private.putUserRole(userInfo, objInfo, _ctx);
    if (rRole.error) {
      return rRole;
    }

    const needsSetup = userInfo.status === UsersRest.Constants.Status.Pending || rAuth.status === 201;
    return { ...rRole, needsSetup };
  },

  /**
   * put user role
   * userInfo: { id, name, schools: [ { id, roles } ] }
   * objInfo: { email, school: { role } }
   */
  putUserRole: async (userInfo, objInfo, _ctx) => {
    const schoolID = _ctx.tenantID;

    const school = userInfo.schools.find((item) => item.id === schoolID);
    const role = school?.roles.find((item) => item === objInfo.school.role);
    if (role) {
      return {
        status: 204,
        value: { userID: userInfo.id, username: userInfo.email, name: userInfo.name, type: UsersAuthConstants.Type },
      };
    }

    // add school role to user
    const rUser = await UsersRest.patchSchool(
      userInfo.id,
      { add: { schools: [{ id: schoolID, roles: [objInfo.school.role] }] } },
      _ctx
    );
    if (rUser.error) {
      return rUser;
    }

    return {
      status: 200,
      value: { userID: userInfo.id, username: userInfo.email, name: userInfo.name, type: UsersAuthConstants.Type },
    };
  },
};

const Public = {
  /**
   * signup a school and invite its first admin
   */
  signup: async (objInfo, _ctx) => {
    // validate
    const v = Validators.Signup.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // this route is authorized for portal admin only, so the tenantID is the portal school ID

    // signup has 2 steps: create school and invite first admin
    const errorO = {
      id: objInfo.email,
      email: objInfo.email,
      name: objInfo.email,
      type: UsersAuthConstants.Type,
      school: objInfo.school.name,
    };
    // create school (with default status pending) and get the id
    // it will be activated when the first admin accepts the invitation
    const rSchool = await SchoolsRest.post(objInfo.school, _ctx);
    if (rSchool.error) {
      // raise event for invalid signup (with the reason)
      const failedAction = `${Private.Action.Signup}.failed`;
      const failedArgs = { ...errorO, reason: rSchool.error.message };
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, failedAction, errorO, failedArgs, _ctx);
      return rSchool;
    }

    // create user and auth and invite user to school
    const schoolID = rSchool.value.id;
    const schoolName = rSchool.value.name;
    const inviteInfo = {
      email: objInfo.email,
      school: { role: UsersRest.Constants.Roles.Admin },
    };

    // the membership of the admin reads the school in the users service (another service: a parameter does not reach
    // it), on the primary, where the school just written is found
    const rInvite = await Public.invite(inviteInfo, { ..._ctx, tenantID: schoolID, tenantName: schoolName });
    if (rInvite.error) {
      // delete school
      await SchoolsRest.delete(schoolID, _ctx);

      // raise event for invalid signup (with the reason)
      const failedAction = `${Private.Action.Signup}.failed`;
      const failedArgs = { ...errorO, reason: rInvite.error.message };
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, failedAction, errorO, failedArgs, _ctx);
      return rInvite;
    }

    // success
    return rInvite;
  },

  /**
   * invite
   * objInfo: { email, school: { role, id? } } - schoolID is _ctx.tenantID
   * a portal admin can name a school (school.id) to invite its admin
   */
  invite: async (objInfo, _ctx) => {
    // validate
    const v = Validators.Invite.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }
    objInfo = v.value; // the validated value: converted (normalized emails, iso dates), no unknown keys

    // the school is named (school.id)
    if (objInfo.school.id) {
      const { id, ...school } = objInfo.school;

      // the selected school: the normal invite (a school admin invites into its own school)
      if (id === _ctx.tenantID) {
        return await Public.invite({ ...objInfo, school }, _ctx);
      }

      // another school: only a portal admin, to invite the admin of that school (the same invite, for that school)
      const rCtx = await Private.getSchoolCtxForPortalInvite(objInfo, _ctx);
      if (rCtx.error) {
        return rCtx;
      }
      return await Public.invite({ ...objInfo, school }, rCtx.value);
    }

    // portal-admin can be given only on the portal school (and nothing else can be given there)
    const rRoles = UsersAuth.validateTenantRoles([objInfo.school.role], _ctx);
    if (rRoles) {
      return rRoles;
    }

    // invite has 2 steps
    const errorO = {
      id: objInfo.email,
      email: objInfo.email,
      name: objInfo.email,
      type: UsersAuthConstants.Type,
    };

    // check if user exists and has school role (read on the primary: a user invited or removed by the request before
    // decides between a new user and a role)
    const userProjection = { ...BaseServiceUtils.Constants.DefaultProjection, email: 1, schools: 1 };
    const options = { readPreference: DbOpsUtils.Constants.ReadPrimary };
    let rUser = await UsersRest.getOneByEmail(objInfo.email, userProjection, _ctx, options);

    const isNewUser = rUser.status === 404;
    let needsSetup = isNewUser;
    if (isNewUser) {
      // the user does not exists -> create
      rUser = await Private.postNewUser(objInfo, _ctx);
    } else if (rUser.status === 200) {
      // user already exists: the role (if not there yet), and an interrupted invite is completed
      rUser = await Private.inviteExistingUser(rUser.value, objInfo, _ctx);
      needsSetup = !!rUser.needsSetup;
    }

    if (rUser.error) {
      // raise event for invalid invite (with the school and the reason)
      const failedAction = `${Private.Action.Invite}.failed`;
      const school = _ctx.tenantName || _ctx.tenantID;
      const failedArgs = { ...errorO, school, reason: rUser.error.message };
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, failedAction, errorO, failedArgs, _ctx);
      return rUser;
    }

    // the email: the setup link (a new token) while the user has not set a password (a new user, a pending user invited
    // again because the first email was lost, a completed invite), otherwise the invitation (at most one each
    // EmailInterval); an active member that already has the role gets nothing (nothing was done: 204)
    const userInfo = { username: objInfo.email };
    if (needsSetup) {
      // the auth record was written (or found) by this invite: the link is made from the answer, it is not read again
      const account = { username: rUser.value.username, userID: rUser.value.userID };
      await UsersAuth.resetPassword(userInfo, _ctx, UsersAuthConstants.ResetTokenType.Signup, account);
    } else if (rUser.status !== 204) {
      await UsersAuth.sendInvite(userInfo, _ctx);
    }

    // the real result (201 a new user, 200 a role added to an existing user, 204 already a member, with the user):
    // the callers inside the service need it; the controllers decide what a user sees
    return { status: rUser.status, value: rUser.value };
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: UsersAuthConstants,
};
