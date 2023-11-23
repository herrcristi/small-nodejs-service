/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/groups`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/groups`,

  // service name
  ServiceName: 'groups',
  ServiceNameInternal: 'groups-internal',

  // Type
  Type: 'group',

  // status
  Status: {
    Pending: 'pending',
    Active: 'active',
    Disabled: 'disabled',
  },
};

module.exports = { ...Public };
