/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/events`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/events`,

  // service name
  ServiceName: 'events',
  ServiceNameInternal: 'events-internal',

  // type
  Type: 'event',
};

module.exports = { ...Public };
