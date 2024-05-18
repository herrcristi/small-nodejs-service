/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/users-auth`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/users-auth`,

  // service name
  ServiceName: 'users-auth',
  ServiceNameInternal: 'users-auth-internal',

  // type
  Type: 'user-auth',

  // token
  AuthToken: 'SmallApp-token',
};

module.exports = { ...Public };
