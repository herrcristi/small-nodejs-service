/**
 * Users service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
const ValidationUtils = require('../../core/utils/validation.utils.js');
const NotificationsUtils = require('../../core/utils/base-service.notifications.utils.js');

const EventsRest = require('../rest/events.rest.js');
const UsersRest = require('../rest/users.rest.js');
const SchoolsRest = require('../rest/schools.rest.js');
const UsersAuth = require('./users-auth.service.js');

const UsersAuthConstants = require('./users-auth.constants.js');

/**
 * validation
 */
const Schema = {
  Signup: Joi.object().keys({
    email: ValidationUtils.email(),
    school: Joi.object().keys({
      name: Joi.string().min(1).max(64).required(),
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
  Signup: Schema.Signup.fork(['email'], (x) => x.required() /*make required */),

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
   * create new user
   * objInfo: { email, school: { role } }
   */
  postNewUser: async (objInfo, _ctx) => {
    // create first user details (with default status pending) and get the id
    const rUser = await UsersRest.post(
      {
        email: objInfo.email,
        schools: [
          {
            id: _ctx.tenantID, // schoolID
            roles: [objInfo.school.role],
          },
        ],
      },
      _ctx
    );
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
      // raise event for invalid signup
      const failedAction = `${Private.Action.Signup}.failed`;
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, failedAction, errorO, errorO, _ctx);
      return rSchool;
    }

    // create user and auth and invite user to school
    const schoolID = rSchool.value.id;
    const schoolName = rSchool.value.name;
    const inviteInfo = {
      email: objInfo.email,
      school: { role: UsersRest.Constants.Roles.Admin },
    };

    const rInvite = await Public.invite(inviteInfo, { ..._ctx, tenantID: schoolID, tenantName: schoolName });
    if (rInvite.error) {
      // delete school
      await SchoolsRest.delete(schoolID, _ctx);

      // raise event for invalid signup
      const failedAction = `${Private.Action.Signup}.failed`;
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, failedAction, errorO, errorO, _ctx);
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

    // check if user exists and has school role
    let rUser = await UsersRest.getOneByEmail(
      objInfo.email,
      { ...BaseServiceUtils.Constants.DefaultProjection, email: 1, schools: 1 },
      _ctx
    );

    const isNewUser = rUser.status === 404;
    if (isNewUser) {
      // the user does not exists -> create
      rUser = await Private.postNewUser(objInfo, _ctx);
    } else if (rUser.status === 200) {
      // user already exists, check if already has the school and role
      rUser = await Private.putUserRole(rUser.value, objInfo, _ctx);
    }

    if (rUser.error) {
      // raise event for invalid invite
      const failedAction = `${Private.Action.Invite}.failed`;
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, failedAction, errorO, errorO, _ctx);
      return rUser;
    }

    // send invitation email and for signup reset password email (dont fail if this returns error)
    const userInfo = { username: objInfo.email };
    if (isNewUser) {
      /* const rr = */ await UsersAuth.resetPassword(userInfo, _ctx, UsersAuthConstants.ResetTokenType.Signup);
    } else {
      /* const rr = */ await UsersAuth.sendInvite(userInfo, _ctx);
    }

    // the real result (201 a new user, 200 a role added to an existing user, 204 already a member, with the user):
    // the callers inside the service need it; the controllers decide what a user sees
    return rUser;
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: UsersAuthConstants,
};
