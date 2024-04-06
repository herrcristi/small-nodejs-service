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
};

const Validators = {
  Signup: Schema.Signup.fork(
    ['email', 'password', 'name', 'birthday', 'address'],
    (x) => x.required() /*make required */
  ),
};

const Private = {
  Action: BaseServiceUtils.Constants.Action,
};

const Public = {
  /**
   * init
   */
  init: async () => {},

  /**
   * signup
   */
  signup: async (objInfo, _ctx) => {
    // validate
    const v = Validators.Signup.validate(objInfo);
    if (v.error) {
      return BaseServiceUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    _ctx.userid = objInfo.email;
    _ctx.username = objInfo.email;

    // signup has 3 steps
    const errorO = { email: objInfo.email };

    // create first user details (with default status pending) and get the id
    const rUser = await UsersRest.post({
      email: objInfo.email,
      name: objInfo.name,
      birthday: objInfo.birthday,
      phoneNumber: objInfo.phoneNumber,
      address: objInfo.address,
    });
    if (rUser.error) {
      // raise event for invalid signup
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Post, errorO, errorO, _ctx);
      return rUser;
    }

    const userID = rUser.id;
    _ctx.userid = userID;

    // create user auth
    const rAuth = await UsersAuthRest.post(
      {
        id: userID,
        email: objInfo.email,
        password: objInfo.password,
      },
      _ctx
    );
    if (rAuth.error) {
      // delete user details
      await UsersAuthRest.delete(userID, _ctx);

      // raise event for invalid signup
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Post, errorO, errorO, _ctx);
      return rAuth;
    }

    // then create school (with default status pending)
    const rSchool = await SchoolsRest.post(objInfo.school, _ctx);
    if (rSchool.error) {
      // delete user details
      await UsersRest.delete(userID, _ctx);
      await UsersAuthRest.delete(userID, _ctx);

      // raise event for invalid signup
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, Private.Action.Post, errorO, errorO, _ctx);
      return rSchool;
    }

    // success
    return rAuth;
  },
};

module.exports = {
  ...Public,
  Validators,
  Constants: UsersAuthConstants,
};
