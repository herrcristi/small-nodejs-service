/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/admins`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/admins`,

  // service name
  ServiceName: 'admins',
  ServiceNameInternal: 'admins-internal',

  // Type
  Type: 'admin',
};

module.exports = { ...Public };
