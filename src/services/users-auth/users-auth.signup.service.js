/**
 * Users service
 */

const Joi = require('joi');

const BaseServiceUtils = require('../../core/utils/base-service.utils.js');
const RestApiUtils = require('../../core/utils/rest-api.utils.js');
const CommonUtils = require('../../core/utils/common.utils.js');
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
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .min(1)
      .max(128),
    school: Joi.object().keys({
      name: Joi.string().min(1).max(64).required(),
      description: Joi.string().min(0).max(1024).allow(null),
    }),
  }),

  Invite: Joi.object().keys({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .min(1)
      .max(128),
    school: Joi.object().keys({
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

  Invite: Schema.Invite.fork(['email'], (x) => x.required() /*make required */),
};

const Private = {
  Action: {
    Signup: 'signup',
    Invite: 'invite',
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
        id: objInfo.email,
        password: CommonUtils.getRandomBytes(32).toString('hex'),
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
   * userInfo: { id, schools: [ { id, roles } ] }
   * objInfo: { email, school: { role } }
   */
  putUserRole: async (userInfo, objInfo, _ctx) => {
    const schoolID = _ctx.tenantID;

    const school = userInfo.schools.find((item) => item.id === schoolID);
    const role = school?.roles.find((item) => item === objInfo.school.role);
    if (role) {
      return {
        status: 204,
        value: { id: userInfo.email, name: userInfo.name, type: UsersAuthConstants.Type, userID: userInfo.id },
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
      value: { id: userInfo.email, name: userInfo.name, type: UsersAuthConstants.Type, userID: userInfo.id },
    };
  },
};

const Public = {
  /**
   * signup
   */
  signup: async (objInfo, _ctx) => {
    // validate
    const v = Validators.Signup.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // currently signup can be done only by portal admin not by anonymous otherwise // _ctx.userID = objInfo.email; // _ctx.username = objInfo.email;

    // signup has 3 steps
    const errorO = {
      id: objInfo.email,
      email: objInfo.email,
      name: objInfo.email,
      type: UsersAuthConstants.Type,
      school: objInfo.school.name,
    };

    // create school (with default status pending)
    const rSchool = await SchoolsRest.post(objInfo.school, _ctx);
    if (rSchool.error) {
      // raise event for invalid signup
      const failedAction = `${Private.Action.Signup}.failed`;
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, failedAction, errorO, errorO, _ctx);
      return rSchool;
    }

    // create user and auth and invite user to school
    const schoolID = rSchool.value.id;
    const inviteInfo = {
      email: objInfo.email,
      school: { role: UsersRest.Constants.Roles.Admin },
    };

    const rInvite = await Public.invite(_ctx.userID, inviteInfo, { ..._ctx, tenantID: schoolID });
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
   * objInfo: { email, school: { role } } - schoolID is _ctx.tenantID
   */
  invite: async (objID, objInfo, _ctx) => {
    // validate
    const v = Validators.Invite.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    // objID is the _ctx.userID

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
    const userInfo = { id: objInfo.email };
    if (isNewUser) {
      /* const rr = */ await UsersAuth.resetPassword(userInfo, _ctx, UsersAuthConstants.ResetTokenType.Signup);
    } else {
      /* const rr = */ await UsersAuth.invite(userInfo, _ctx);
    }

    return rUser;
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: UsersAuthConstants,
};
