/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/user-auth`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/user-auth`,

  // service name
  ServiceName: 'users-auth',
  ServiceNameInternal: 'users-auth-internal',

  // type
  Type: 'user-auth',
};

module.exports = { ...Public };
