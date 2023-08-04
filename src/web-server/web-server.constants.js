/**
 * Constants file
 */

const Public = {
  // paths
  BaseApiPath: '/api/v1',
  BaseApiPathInternal: '/api/internal_v1',

  // web service port
  Port: process.env.PORT || 8080,
};

module.exports = { ...Public };
