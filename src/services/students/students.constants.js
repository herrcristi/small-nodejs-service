/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/students`,

  // Type
  Type: 'student',

  // service name
  ServiceName: 'students',
};

module.exports = { ...Public };
