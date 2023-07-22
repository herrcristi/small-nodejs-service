/**
 * Database
 */

const Public = {
  /**
   * init
   */
  init: async () => {
    console.log('Init students database');
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    return null;
  },
};

module.exports = { ...Public };
