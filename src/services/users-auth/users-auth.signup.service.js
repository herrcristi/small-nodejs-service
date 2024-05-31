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
const UsersAuthRest = require('./users-auth.service.js');

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
    password: Joi.string().min(1).max(64),
    name: Joi.string().min(1).max(128),
    birthday: Joi.date().iso(),
    phoneNumber: Joi.string()
      .min(1)
      .max(32)
      .regex(/^(\d|\+|\-|\.|' ')*$/), // allow 0-9 + - . in any order
    address: Joi.string().min(1).max(256),
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
  Signup: Schema.Signup.fork(
    ['email', 'password', 'name', 'birthday', 'address'],
    (x) => x.required() /*make required */
  ),

  Invite: Schema.Invite.fork(['email'], (x) => x.required() /*make required */),
};

const Private = {
  Action: {
    Signup: 'signup',
    Invite: 'invite',
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
      name: objInfo.name,
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

    const schoolID = rSchool.value.id;

    // create first user details (with default status pending) and get the id
    const rUser = await UsersRest.post(
      {
        email: objInfo.email,
        name: objInfo.name,
        birthday: objInfo.birthday,
        phoneNumber: objInfo.phoneNumber,
        address: objInfo.address,
        schools: [
          {
            id: schoolID,
            roles: [UsersRest.Constants.Roles.Admin],
          },
        ],
      },
      _ctx
    );
    if (rUser.error) {
      // delete school
      await SchoolsRest.delete(schoolID, _ctx);

      // raise event for invalid signup
      const failedAction = `${Private.Action.Signup}.failed`;
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, failedAction, errorO, errorO, _ctx);
      return rUser;
    }

    const userID = rUser.value.id;
    errorO.id = userID;
    _ctx.userID = userID;

    // create user auth
    const rAuth = await UsersAuthRest.post(
      {
        id: objInfo.email,
        password: objInfo.password,
        userID: userID,
      },
      _ctx
    );
    if (rAuth.error) {
      // delete previous
      await SchoolsRest.delete(schoolID, _ctx);
      await UsersRest.delete(userID, _ctx);

      // raise event for invalid signup
      const failedAction = `${Private.Action.Signup}.failed`;
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, failedAction, errorO, errorO, _ctx);
      return rAuth;
    }

    // success
    return rAuth;
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
      name: objInfo.name,
      type: UsersAuthConstants.Type,
    };

    const schoolID = _ctx.tenantID;

    // TODO
    return { status: 500, error: { message: `Not implemented`, error: new Error(`Not implemented`) } };
    // // create first user details (with default status pending) and get the id
    // const rUser = await UsersRest.post(
    //   {
    //     email: objInfo.email,
    //     name: objInfo.name,
    //     birthday: objInfo.birthday,
    //     phoneNumber: objInfo.phoneNumber,
    //     address: objInfo.address,
    //     schools: [
    //       {
    //         id: schoolID,
    //         roles: [UsersRest.Constants.Roles.Admin],
    //       },
    //     ],
    //   },
    //   _ctx
    // );
    // if (rUser.error) {
    //   // raise event for invalid invite
    //   const failedAction = `${Private.Action.Invite}.failed`;
    //   await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, failedAction, errorO, errorO, _ctx);
    //   return rUser;
    // }

    // const userID = rUser.value.id;
    // errorO.id = userID;
    // _ctx.userID = userID;

    // // create user auth
    // const rAuth = await UsersAuthRest.post(
    //   {
    //     id: objInfo.email,
    //     password: objInfo.password,
    //     userID: userID,
    //   },
    //   _ctx
    // );
    // if (rAuth.error) {
    //   // delete previous
    //   await UsersRest.delete(userID, _ctx);

    //   // raise event for invalid invite
    //   const failedAction = `${Private.Action.Invite}.failed`;
    //   await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, failedAction, errorO, errorO, _ctx);
    //   return rAuth;
    // }

    // // success
    // return rAuth;
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: UsersAuthConstants,
};
