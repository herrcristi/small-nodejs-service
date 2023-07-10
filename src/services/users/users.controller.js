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
    email: Joi.email().min(1).max(64).label('Email'),
    firstName: Joi.string().min(1).max(64).label('First Name'),
    lastName: Joi.string().min(1).max(64).label('Last Name'),
    birthday: Joi.date().min(1).max(64).prefs({ dateFormat: 'iso' }).label('Birthday'),
    phoneNumber: Joi.string().min(1).max(32).optional().label('Phone number'),
    address: Joi.string().min(1).max(256).label('Address'),
    schools: Joi.array(Joi.string().min(1).max(32).optional()).label('Schools'),
  }),
};

const Validators = {
  /**
   * for post
   */
  Post: Schema.User.fork(
    ['email', 'firstName', 'lastName', 'birthday', 'address', 'schools'],
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
  getAll: async (req, res, _next) => {
    // call base implementation
    return RestControllerUtils.getAll(Config.Controller, req, res, _next);
  },

  /**
   * get one
   */
  getOne: async (req, res, _next) => {
    // call base implementation
    return RestControllerUtils.getOne(Config.Controller, req, res, _next);
  },
};

module.exports = { ...Public };
