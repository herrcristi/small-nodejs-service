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
  // the most schools read at once when the status of the professors written by an earlier version is completed
  FillMissingStatusBatch: 100,
};

module.exports = { ...Public };
