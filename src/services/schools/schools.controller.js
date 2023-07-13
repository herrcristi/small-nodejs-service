/**
 * Schools controller
 */
const Joi = require('joi');

const RestApiUtils = require('../../core/utils/rest-api.utils');
const RestMsgUtils = require('../../core/utils/rest-messages.utils');
const RestControllerUtils = require('../../core/utils/rest-controller.utils');

const SchoolsConstants = require('./schools.constants');
const SchoolsService = require('./schools.service');

/**
 * validation
 */
const Schema = {
  School: Joi.object().keys({
    name: Joi.string().min(1).max(64),
    status: Joi.string()
      .min(1)
      .max(64)
      .valid(...Object.values(SchoolsConstants.Status)),
  }),
};

const Validators = {
  /**
   * for post
   */
  Post: Schema.School.fork(['name'], (x) => x.required() /*make required */),
};

const Config = {
  /**
   * controller config
   */
  Controller: {
    name: 'Schools',
    schema: Schema.School,
    service: SchoolsService,
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
    const result = await RestControllerUtils.post({ ...Config.Controller, schema: Validators.Post }, req, res, next);
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
