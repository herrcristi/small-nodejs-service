/**
 * Constants file
 */

const Public = {
  // paths
  BaseApiPath: '/api/v1',
  StudentsApiPath: '/api/v1/students',

  // web service port
  Port: process.env.WEB_PORT || 8080,
};

module.exports = { ...Public };
