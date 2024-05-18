/**
 * Web server
 */
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const RequestMiddleware = require('./request.middleware.js');

const Public = {
  /**
   * init a webserver
   */
  init: async (port, routers /*: [] */, middlewares /* :[] */ = null, usersAuthMiddleware /* :[] */ = null) => {
    console.log(`\nInit web server on port ${port}`);

    let app = express();
    let bodyParser = require('body-parser');

    //parse application/json and look for raw text
    app.use(cors());
    app.use(cookieParser());
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
            // add middleware to routes here with route.all to have access to req.route.path
            usersAuthMiddleware.forEach((middleware) => {
              app[method](layer.route.path, middleware?.middleware || middleware);
            });
          });
        });
      }

      app.use(route);
    });

    // listen
    const server = app.listen(port);

    console.log('\nWeb server Listening on port ' + port);

    return { app, server };
  },
};

module.exports = { ...Public };
