/**
 * Users controller
 */
const Joi = require('joi');

const RestApiUtils = require('../../core/utils/rest-api.utils');
const RestMsgUtils = require('../../core/utils/rest-messages.utils');
const RestControllerUtils = require('../../core/utils/rest-controller.utils');

const UserConstants = require('./users.constants');
const UsersService = require('./users.service');

/**
 * validation
 */
const Schema = {
  User: Joi.object().keys({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .min(1)
      .max(64)
      .label('Email'),
    password: Joi.string().min(1).max(64).label('Password'), // TODO move to usersLogin
    firstName: Joi.string().min(1).max(64).label('First Name'),
    lastName: Joi.string().min(1).max(64).label('Last Name'),
    birthday: Joi.date().min(1).max(64).prefs({ dateFormat: 'iso' }).label('Birthday'),
    phoneNumber: Joi.string().min(1).max(32).optional().label('Phone number'),
    address: Joi.string().min(1).max(256).label('Address'),
    schools: Joi.array().items(Joi.string().min(1).max(32).optional()).label('Schools'),
  }),
};

const Validators = {
  /**
   * for post
   */
  Post: Schema.User.fork(
    ['email', 'password', 'firstName', 'lastName', 'birthday', 'address', 'schools'],
    (x) => x.required() /*make required */
  ),
};

const Config = {
  /**
   * controller config
   */
  Controller: {
    name: 'Users',
    schema: Schema.User,
    service: UsersService,
  },
};

const Public = {
  /**
   * get all
   */
  getAll: async (req, res, next) => {
    // call base implementation -> { status, error?, value? }
    const result = await RestControllerUtils.getAll(Config.Controller, req, res, next);
    await RestControllerUtils.reply(Config.Controller, result, req, res, next);
  },

  /**
   * get one
   */
  getOne: async (req, res, next) => {
    // call base implementation -> { status, error?, value? }
    const result = await RestControllerUtils.getOne(Config.Controller, req, res, next);
    await RestControllerUtils.reply(Config.Controller, result, req, res, next);
  },

  /**
   * post
   */
  post: async (req, res, next) => {
    // call base implementation -> { status, error?, value? }
    const result = await RestControllerUtils.delete({ ...Config.Controller, schema: Validators.Post }, req, res, next);
    await RestControllerUtils.reply(Config.Controller, result, req, res, next);
  },

  /**
   * delete
   */
  delete: async (req, res, next) => {
    // call base implementation -> { status, error?, value? }
    const result = await RestControllerUtils.delete(Config.Controller, req, res, next);
    await RestControllerUtils.reply(Config.Controller, result, req, res, next);
  },

  /**
   * patch
   */
  patch: async (req, res, next) => {
    // call base implementation -> { status, error?, value? }
    const result = await RestControllerUtils.patch(Config.Controller, req, res, next);
    await RestControllerUtils.reply(Config.Controller, result, req, res, next);
  },

  /**
   * put
   */
  put: async (req, res, next) => {
    // call base implementation -> { status, error?, value? }
    const result = await RestControllerUtils.put(Config.Controller, req, res, next);
    await RestControllerUtils.reply(Config.Controller, result, req, res, next);
  },
};

module.exports = { ...Public };
