/**
 * Entry point of the service
 */
const WebServer = require('./web-server/web-server.js');
const ConfigServices = require('./services/config.services.js');
const { EventEmitter } = require('events');

const e = new EventEmitter();

/**
 * init service
 */
const init = async () => {
  console.log('Init service');

  await WebServer.init();
  await ConfigServices.init();

  // emit that service was inited
  e.emit('inited');
};

// auto init
init();

module.exports = e;
