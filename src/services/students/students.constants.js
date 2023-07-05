/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  StudentsApiPath: `${WebConstants.BaseApiPath}/students`,
};

module.exports = { ...Public };
