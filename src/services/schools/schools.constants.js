/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/schools`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/schools`,

  // service name
  ServiceName: 'schools',
  ServiceNameInternal: 'schools-internal',

  // type
  Type: 'school',

  // status
  // pending: created by a signup, until a member logs in (removed when nobody logs in in time, see PendingExpiresDays)
  Status: {
    Pending: 'pending',
    Active: 'active',
    Disabled: 'disabled',
  },

  // the settings of a school
  Settings: {
    // what happens to the records of a member (student, professor, admin) when its role is removed or its account
    // is deleted
    RemovedMembers: {
      Keep: 'keep', // the record stays as a trace, marked disabled (role removed) or deleted (account deleted)
      Delete: 'delete', // the record is deleted, and removed from the groups and schedules
    },
  },
  DefaultSettings: { removedMembers: 'keep' },

  // how often the pending schools are checked for an expired signup (seconds)
  PendingCleanupInterval: 60 * 60,
};

module.exports = { ...Public };
