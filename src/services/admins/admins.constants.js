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
  // the most schools read at once when the status of the admins written by an earlier version is completed
  FillMissingStatusBatch: 100,
};

module.exports = { ...Public };
