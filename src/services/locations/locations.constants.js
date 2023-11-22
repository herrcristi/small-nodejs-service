/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/locations`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/locations`,

  // service name
  ServiceName: 'locations',
  ServiceNameInternal: 'locations-internal',

  // Type
  Type: 'location',

  // status
  Status: {
    Pending: 'pending',
    Active: 'active',
    Disabled: 'disabled',
  },
};

module.exports = { ...Public };
