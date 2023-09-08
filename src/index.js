/**
 * Entry point of the service
 */
const fs = require('fs');
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

  // init env
  console.log(`Current env: ${process.env.NODE_ENV}`);
  const envFile = path.resolve(__dirname, `./.${process.env.NODE_ENV}.env`);
  if (fs.existsSync(envFile)) {
    let config = require('dotenv').config({ path: envFile, override: true });
    require('dotenv-expand').expand(config);
  }

  // init web server
  await WebServer.init();

  // init language
  for (const lang of Languages) {
    await TranslationsUtils.initLanguage(lang, path.resolve(__dirname, `translations/${lang}.json`));
  }

  // init services
  await ConfigServices.init();

  // emit that service was inited
  e.emit('inited');
};

// auto init
init();

module.exports = e;
