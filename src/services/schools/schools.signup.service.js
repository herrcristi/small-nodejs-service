/**
 * Schools signup service
 */
const Joi = require('joi');

const CommonUtils = require('../../core/utils/common.utils.js');
const EventsRest = require('../rest/events.rest.js');
const SchoolsRest = require('../rest/schools.rest.js');
const UsersRest = require('../rest/users.rest.js');
const UsersAuthSignupService = require('../users-auth/users-auth.signup.service.js');
const UsersAuthConstants = require('../users-auth/users-auth.constants.js');
const SchoolsConstants = require('./schools.constants.js');

const Schema = {
  Signup: Joi.object().keys({
    email: Joi.string().email({ tlds: { allow: false } }).min(1).max(128).required(),
    school: Joi.object().keys({
      name: Joi.string().min(1).max(64).required(),
      description: Joi.string().min(0).max(1024).allow(null),
    }).required(),
  }),
  InviteAdmin: Joi.object().keys({
    email: Joi.string().email({ tlds: { allow: false } }).min(1).max(128).required(),
  }),
};

const Private = {
  Action: {
    Signup: 'signup',
  },
};

const Validators = {
  Signup: Schema.Signup,
  InviteAdmin: Schema.InviteAdmin,
};

const Public = {
  /**
   * signup a school and invite its first admin
   */
  signup: async (objInfo, _ctx) => {
    const v = Validators.Signup.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    const errorO = {
      id: objInfo.email,
      email: objInfo.email,
      name: objInfo.email,
      type: UsersAuthConstants.Type,
      school: objInfo.school.name,
    };

    const rSchool = await SchoolsRest.post(objInfo.school, _ctx);
    if (rSchool.error) {
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, `${Private.Action.Signup}.failed`, errorO, errorO, _ctx);
      return rSchool;
    }

    const rInvite = await UsersAuthSignupService.invite(
      { email: objInfo.email, school: { role: UsersRest.Constants.Roles.Admin } },
      { ..._ctx, tenantID: rSchool.value.id, tenantName: rSchool.value.name }
    );
    if (rInvite.error) {
      await SchoolsRest.delete(rSchool.value.id, _ctx);
      await EventsRest.raiseEventForObject(UsersAuthConstants.ServiceName, `${Private.Action.Signup}.failed`, errorO, errorO, _ctx);
      return rInvite;
    }

    return rInvite;
  },

  /**
   * invite an admin to an active managed school
   */
  inviteAdmin: async (schoolID, objInfo, _ctx) => {
    const v = Validators.InviteAdmin.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    if (schoolID === process.env.SMALL_API_PORTAL_SCHOOL_ID) {
      const msg = 'The portal school cannot be managed as a tenant';
      return { status: 403, error: { message: msg, error: new Error(msg) } };
    }

    const rSchool = await SchoolsRest.getOne(schoolID, { id: 1, name: 1, status: 1 }, _ctx);
    if (rSchool.error) {
      return rSchool;
    }
    if (rSchool.value.status !== SchoolsConstants.Status.Active) {
      const msg = 'Admins can only be invited to active schools';
      return { status: 400, error: { message: msg, error: new Error(msg) } };
    }

    return await UsersAuthSignupService.invite(
      { email: objInfo.email, school: { role: UsersRest.Constants.Roles.Admin } },
      { ..._ctx, tenantID: schoolID, tenantName: rSchool.value.name }
    );
  },
};

module.exports = {
  ...Public,
  Validators,
};