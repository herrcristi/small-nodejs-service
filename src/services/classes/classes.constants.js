/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/classes`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/classes`,

  // service name
  ServiceName: 'classes',
  ServiceNameInternal: 'classes-internal',

  // Type
  Type: 'class',

  // status
  Status: {
    Pending: 'pending',
    Active: 'active',
    Disabled: 'disabled',
  },

  // Required
  Required: {
    Required: 'required',
    Optional: 'optional',
  },
};

module.exports = { ...Public };
