/**
 * Web server
 */
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const CommonUtils = require('../utils/common.utils.js');
const RequestMiddleware = require('./request.middleware.js');
const ErrorMiddleware = require('./error.middleware.js');
const CorsMiddleware = require('./cors.middleware.js');
const RateLimiterMiddleware = require('./rate-limiter.middleware.js');
const HttpsMiddleware = require('./https.middleware.js');
const SecurityHeadersMiddleware = require('./security-headers.middleware.js');

const Public = {
  /**
   * init a webserver
   */
  init: async (port, routers /*: [] */, middlewares /* :[] */ = null, usersAuthMiddleware /* :[] */ = null) => {
    console.log(`\nInit web server on port ${port}`);

    // init
    await CorsMiddleware.init();

    // setup express app and middlewares
    let app = express();
    let bodyParser = require('body-parser');

    app.use(cors(CorsMiddleware.cors));

    app.use(cookieParser());

    // Add a generic auth-rate limiter scaffold accessible via app.locals.authLimiter
    app.locals.authLimiter = rateLimit(RateLimiterMiddleware.authLimiter);
    app.use(app.locals.authLimiter);

    // Security headers and HTTPS enforcement
    const isProduction = !CommonUtils.isDebug();
    if (isProduction) {
      app.use(HttpsMiddleware.middleware);
    }

    app.use(SecurityHeadersMiddleware.middleware);

    // parse application/json and look for raw text
    app.use(bodyParser.json({ limit: '5mb' }));
    app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
    app.use(bodyParser.text());
    app.use(bodyParser.json({ limit: '5mb', type: 'application/json' }));

    // add middlewares
    app.use(RequestMiddleware.middleware); // adds a req._ctx

    if (Array.isArray(middlewares)) {
      middlewares.forEach((middleware) => app.use(middleware?.middleware || middleware));
    }

    // add routes
    if (!Array.isArray(routers)) {
      routers = [routers];
    }
    routers.forEach((route) => {
      // add users auth middlewares
      if (Array.isArray(usersAuthMiddleware)) {
        route.stack.forEach((layer) => {
          Object.keys(layer.route.methods).forEach((method) => {
            // add middleware to routes here to have access to req.route.path
            usersAuthMiddleware.forEach((middleware) => {
              app[method](layer.route.path, middleware?.middleware || middleware);
            });
          });
        });
      }

      app.use(route);
    });
    app.use(ErrorMiddleware.middleware);

    // listen
    const server = app.listen(port);

    console.log('\nWeb server Listening on port ' + port);

    return { app, server };
  },
};

module.exports = { ...Public };
