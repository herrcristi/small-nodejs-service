/**
 * Students controller
 */

const Joi = require('joi');

const RestApiUtils = require('../../core/utils/rest-api.utils');
const RestMsgUtils = require('../../core/utils/rest-messages.utils');

const StudentConstants = require('./students.constants');
const StudentsService = require('./students.service');

/**
 * validation
 */
const Schema = {
  Student: Joi.object().keys({
    user: Joi.string().min(1).max(64),
    classes: Joi.array(Joi.string().min(1).max(64)).label('Classes'),
  }),
};

const Validators = {
  /**
   * for post
   */
  Post: Schema.Student.fork(['user', 'classes'], (x) => x.required() /*make required */),
};

const Config = {
  /**
   * controller config
   */
  Controller: {
    name: 'Students',
    schema: Schema.Student,
    service: StudentsService,
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
