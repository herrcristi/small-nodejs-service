/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  UsersApiPath: `${WebConstants.BaseApiPath}/users`,
};

module.exports = { ...Public };
