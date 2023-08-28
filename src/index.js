/**
 * Entry point of the service
 */
const path = require('path');

const TranslationsUtils = require('./core/utils/translations.utils.js');
const WebServer = require('./web-server/web-server.js');
const ConfigServices = require('./services/config.services.js');

const { EventEmitter } = require('events');

const e = new EventEmitter();

const Languages = ['en', 'ro'];
/**
 * init service
 */
const init = async () => {
  console.log('Init service');

  await WebServer.init();

  for (const lang of Languages) {
    await TranslationsUtils.initLanguage(lang, path.resolve(__dirname, `translations/${lang}.json`));
  }

  await ConfigServices.init();

  // emit that service was inited
  e.emit('inited');
};

// auto init
init();

module.exports = e;
