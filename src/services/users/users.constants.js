/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/users`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/users`,

  // service name
  ServiceName: 'users',
  ServiceNameInternal: 'users-internal',

  // type
  Type: 'user',

  // status
  Status: {
    Pending: 'pending',
    Active: 'active',
    Disabled: 'disabled',
  },

  // roles (must match the services types)
  Roles: {
    Admin: 'admin',
    Professor: 'professor',
    Student: 'student',
  },
};

module.exports = { ...Public };
