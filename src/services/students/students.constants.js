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
  // the most schools read at once when the status of the students written by an earlier version is completed
  FillMissingStatusBatch: 100,
};

module.exports = { ...Public };
