/**
 * Database
 */

const Public = {
  /**
   * init
   */
  init: async () => {
    console.log('Init events database');
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    // TODO events can be per portal or per school
    return null;
  },
};

module.exports = { ...Public };
