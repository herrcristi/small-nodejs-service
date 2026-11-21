/**
 * Cors middleware
 */

const Public = {
  /**
   * the CORS options of a web server: only the origins given by the application can call it (with the cookie)
   * origins: [ 'https://ui.example.test', ... ]
   */
  getCors: (origins) => {
    const trimmedOrigins = (origins || []).map((origin) => `${origin}`.trim());
    const allowedOrigins = new Set(trimmedOrigins.filter((origin) => origin));

    return {
      origin: function (origin, callback) {
        if (origin && allowedOrigins.has(origin)) {
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
        'x-lang',
        'x-request-id',
        'x-reset-token', // the reset password page (the identity headers are never read from a request)
      ],
      maxAge: 86400,
    };
  },
};

module.exports = { ...Public };
