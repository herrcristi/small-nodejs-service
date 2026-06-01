/**
 * Cors middleware
 */
const CommonUtils = require('../utils/common.utils.js');

const Private = {
  corsOriginsSet: null,

  initCorsOriginsSet: function () {
    if (Private.corsOriginsSet) {
      return;
    }

    // parse application/json and look for raw text
    // Configure CORS with an origin whitelist (set SMALL_API_CORS_ORIGIN env var)
    const corsOriginsVec = process.env.SMALL_API_CORS_ORIGIN.split(',').map((origin) => origin.trim());
    Private.corsOriginsSet = new Set(corsOriginsVec);
  },
};

const Public = {
  /**
   * Setup for CORS
   */
  init: async () => {
    Private.initCorsOriginsSet();
    return true;
  },

  cors: {
    origin: function (origin, callback) {
      if (origin && Private.corsOriginsSet.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-tenant-id',
      'x-user-id',
      'x-user-name',
      'x-lang',
      'x-request-id',
    ],
    maxAge: 86400,
  },
};

module.exports = { ...Public };
