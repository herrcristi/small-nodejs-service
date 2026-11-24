/**
 * Constants file
 */

const Public = {
  // paths
  BaseApiPath: '/api/v1',
  BaseApiPathInternal: '/api/internal_v1',

  // the languages of the application: the translations of src/translations (loaded at the start), the language of a
  // user (its profile) and of an invitation; the first one is the default
  Languages: ['en', 'ro'],
};

module.exports = { ...Public };
