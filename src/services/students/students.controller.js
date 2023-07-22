/**
 * Students controller
 */

const Joi = require('joi');

const RestApiUtils = require('../../core/utils/rest-api.utils');
const RestMsgUtils = require('../../core/utils/rest-messages.utils');

const StudentsConstants = require('./students.constants');
const StudentsService = require('./students.service');

/**
 * validation
 */
const Schema = {
  Student: Joi.object().keys({
    user: Joi.string().min(1).max(64),
    classes: Joi.array().items(Joi.string().min(1).max(64)).label('Classes'),
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
  getAll: async (req, res, next) => {
    // call base implementation -> { status, error?, value? }
    const result = await BaseControllerUtils.getAll(Config.Controller, req, res, next);
    await BaseControllerUtils.reply(Config.Controller, result, req, res, next);
  },

  /**
   * get one
   */
  getOne: async (req, res, next) => {
    // call base implementation -> { status, error?, value? }
    const result = await BaseControllerUtils.getOne(Config.Controller, req, res, next);
    await BaseControllerUtils.reply(Config.Controller, result, req, res, next);
  },

  /**
   * post
   */
  post: async (req, res, next) => {
    // call base implementation -> { status, error?, value? }
    const result = await BaseControllerUtils.post({ ...Config.Controller, schema: Validators.Post }, req, res, next);
    await BaseControllerUtils.reply(Config.Controller, result, req, res, next);
  },

  /**
   * delete
   */
  delete: async (req, res, next) => {
    // call base implementation -> { status, error?, value? }
    const result = await BaseControllerUtils.delete(Config.Controller, req, res, next);
    await BaseControllerUtils.reply(Config.Controller, result, req, res, next);
  },

  /**
   * patch
   */
  patch: async (req, res, next) => {
    // call base implementation -> { status, error?, value? }
    const result = await BaseControllerUtils.patch(Config.Controller, req, res, next);
    await BaseControllerUtils.reply(Config.Controller, result, req, res, next);
  },

  /**
   * put
   */
  put: async (req, res, next) => {
    // call base implementation -> { status, error?, value? }
    const result = await BaseControllerUtils.put(Config.Controller, req, res, next);
    await BaseControllerUtils.reply(Config.Controller, result, req, res, next);
  },
};

module.exports = { ...Public };
