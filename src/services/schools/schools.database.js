/**
 * Database
 */

const Public = {
  /**
   * init
   */
  init: async () => {
    console.log('Init schools database');
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    return null;
  },
};

module.exports = { ...Public };
