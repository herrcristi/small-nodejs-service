/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/events`,

  // service name
  ServiceName: 'events',

  // type
  Type: 'event',

  // severity
  Severity: {
    Informational: 'info',
    Warning: 'warning',
    Critical: 'critical',
  },
};

module.exports = { ...Public };
