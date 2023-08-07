/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/students`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/students`,

  // service name
  ServiceName: 'students',
  ServiceNameInternal: 'students-internal',

  // Type
  Type: 'student',
};

module.exports = { ...Public };
