/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/schedules`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/schedules`,

  // service name
  ServiceName: 'schedules',
  ServiceNameInternal: 'schedules-internal',

  // Type
  Type: 'schedule',

  // status
  Status: {
    Pending: 'pending',
    Active: 'active',
    Disabled: 'disabled',
  },

  // freq
  Frequency: {
    Once: 'once',
    Weekly: 'weekly',
    BiWeekly: 'biWeekly',
    Monthly: 'monthly',
  },
};

module.exports = { ...Public };
