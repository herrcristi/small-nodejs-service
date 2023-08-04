/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/students`,

  // service name
  ServiceName: 'students',

  // Type
  Type: 'student',
};

module.exports = { ...Public };
