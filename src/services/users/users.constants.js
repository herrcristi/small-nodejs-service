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
  // deleted: the user deleted its account: no login and no memberships; the record is kept (its id, name and email)
  // so the records of the schools keep their person, and an invitation of the same email opens it again
  Status: {
    Pending: 'pending',
    Active: 'active',
    Disabled: 'disabled',
    Deleted: 'deleted',
  },

  // the personal profile fields, removed when the account is deleted
  ProfileFields: ['birthday', 'phoneNumber', 'address'],

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
