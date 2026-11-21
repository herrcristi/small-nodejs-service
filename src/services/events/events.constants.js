/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/events`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/events`,

  // service name
  ServiceName: 'events',
  ServiceNameInternal: 'events-internal',

  // type
  Type: 'event',

  /**
   * severity
   */
  Severity: {
    Informational: 'info',
    Warning: 'warning',
    Critical: 'critical',
  },

  /**
   * the user of an event that is done without a logged-in user (its id and its username are this name): an event
   * always tells who did it
   */
  NoLoginUsers: {
    PendingCleanup: 'cleanup pending', // the regular removal of the invitations and the signups not used in time
    Setup: 'setup', // the start: the portal school and the invitation of the first portal admin
    Anonymous: 'anonymous', // a public form, nobody logged in (reset password)
  },
};

module.exports = { ...Public };
