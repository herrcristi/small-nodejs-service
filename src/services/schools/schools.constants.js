/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  SchoolsApiPath: `${WebConstants.BaseApiPath}/schools`,

  // status
  Status: {
    Pending: 'pending',
    Active: 'active',
    Disabled: 'disabled',
  },
};

module.exports = { ...Public };
