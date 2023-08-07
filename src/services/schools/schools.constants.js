/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/schools`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/schools`,

  // service name
  ServiceName: 'schools',
  ServiceNameInternal: 'schools-internal',

  // type
  Type: 'school',

  // status
  Status: {
    Pending: 'pending',
    Active: 'active',
    Disabled: 'disabled',
  },
};

module.exports = { ...Public };
