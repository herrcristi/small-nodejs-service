/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/professors`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/professors`,

  // service name
  ServiceName: 'professors',
  ServiceNameInternal: 'professors-internal',

  // Type
  Type: 'professor',
};

module.exports = { ...Public };
