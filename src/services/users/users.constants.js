/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/users`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/users`,

  // service name
  ServiceName: 'users',
  ServiceNameInternal: 'users-internal',

  // type
  Type: 'user',

  // status
  // pending: invited, never logged in (removed when the invitation is not used in time, see PendingExpiresDays)
  // the users referenced by the schools (students, professors, admins) as traces have also:
  // deleted: the user deleted its account (the user does not exist anymore), removed: its role was removed
  Status: {
    Pending: 'pending',
    Active: 'active',
    Disabled: 'disabled',
    Deleted: 'deleted',
    Removed: 'removed',
  },

  // how often the pending users are checked for an expired invitation (seconds)
  PendingCleanupInterval: 60 * 60,

  // roles (must match the services types)
  Roles: {
    PortalAdmin: 'portal-admin',
    Admin: 'admin',
    Professor: 'professor',
    Student: 'student',
  },
};

module.exports = { ...Public };
