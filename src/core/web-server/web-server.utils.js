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
const SanitizeMiddleware = require('./sanitize.middleware.js');

const Private = {
  /**
   * run the middleware only for the first route that matches the request
   * the middlewares are added for every route, and express continues to the next matching route after next(),
   * so '/users/portal-admins' would be checked a second time as '/users/:id' (with 'portal-admins' as the id)
   * routers are ordered with the specific routes first, so the first match is the right one
   */
  runOnce: (middleware) => {
    const ran = Symbol('ran'); // one flag for each middleware
    return (req, res, next) => {
      if (req[ran]) {
        return next();
      }
      req[ran] = true;
      return middleware(req, res, next);
    };
  },
};

const Public = {
  /**
   * the 'trust proxy' setting of express from the setting of the application (trustProxy)
   * a number of proxies (1), or their addresses / subnets ('loopback, 10.0.0.0/8'); not set: no proxy is trusted
   * 'true' (trust every proxy) is not accepted: any client could then choose its address with x-forwarded-for
   */
  getTrustProxy: (trustProxy) => {
    const value = `${trustProxy || ''}`.trim();
    const lowerValue = value.toLowerCase();
    if (!value || ['false', 'true'].includes(lowerValue)) {
      return false;
    }
    if (/^\d+$/.test(value)) {
      return Number.parseInt(value, 10);
    }
    return value;
  },

  /**
   * init a webserver
   * settings: the settings of the application { corsOrigins: [], trustProxy, rateLimits: { max, loginMax,
   * loginAccountMax, resetMax } } (the core never reads the environment of an application)
   */
  init: async (
    port,
    routers /*: [] */,
    middlewares /* :[] */ = null,
    usersAuthMiddleware /* :[] */ = null,
    settings = {}
  ) => {
    console.log(`\nInit web server on port ${port}`);

    // init
    RateLimiterMiddleware.init(settings.rateLimits);

    // setup express app and middlewares
    let app = express();

    // the proxies in front of the service: req.ip is then the client (from x-forwarded-for), used by the rate limits
    // and the events; without it req.ip is the address of the proxy and a client can not choose its own address
    const trustProxy = Public.getTrustProxy(settings.trustProxy);
    app.set('trust proxy', trustProxy);
    let bodyParser = require('body-parser');

    const corsOptions = CorsMiddleware.getCors(settings.corsOrigins);
    const corsMiddleware = cors(corsOptions);
    app.use(corsMiddleware);

    const cookieMiddleware = cookieParser();
    app.use(cookieMiddleware);

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
    const jsonParser = bodyParser.json({ limit: '5mb' });
    const urlencodedParser = bodyParser.urlencoded({ limit: '5mb', extended: true });
    const textParser = bodyParser.text();
    const jsonTypeParser = bodyParser.json({ limit: '5mb', type: 'application/json' });
    app.use(jsonParser);
    app.use(urlencodedParser);
    app.use(textParser);
    app.use(jsonTypeParser);

    // add middlewares
    app.use(RequestMiddleware.middleware); // adds a req._ctx
    app.use(SanitizeMiddleware.middleware); // refuses a body with keys that change the prototype of an object

    if (Array.isArray(middlewares)) {
      middlewares.forEach((middleware) => app.use(middleware?.middleware || middleware));
    }

    // add routes
    if (!Array.isArray(routers)) {
      routers = [routers];
    }
    // one wrapper for each middleware, shared by all the routes (the flag is per middleware and request)
    const authMiddlewares = Array.isArray(usersAuthMiddleware)
      ? usersAuthMiddleware.map((middleware) => Private.runOnce(middleware?.middleware || middleware))
      : null;

    routers.forEach((route) => {
      // add users auth middlewares
      if (authMiddlewares) {
        route.stack.forEach((layer) => {
          Object.keys(layer.route.methods).forEach((method) => {
            // add middleware to routes here to have access to req.route.path
            authMiddlewares.forEach((middleware) => {
              app[method](layer.route.path, middleware);
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
