/**
 * Database
 */

const DBMgr = require('../../core/utils/database-manager.utils');

const SchoolsConstants = require('./schools.constants');

const Private = {
  DB: null,
};

const Public = {
  /**
   * init
   */
  init: async (_ctx) => {
    console.log('Init schools database');
    Private.DB = await DBMgr.connect('DB', _ctx);
  },

  /**
   * get collection
   */
  collection: async (_ctx) => {
    return Private.DB?.collection(SchoolsConstants.ServiceName);
  },
};

module.exports = { ...Public };
