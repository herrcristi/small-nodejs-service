/**
 * Web server
 */
const morgan = require('morgan');

const RequestMiddleware = require('./request.middleware');

const Public = {
  /**
   * init a webserver
   */
  init: async (port, routers /*: [] */, middlewares /* :[] */ = null) => {
    console.log(`Init web server on port ${port}`);

    let express = require('express');
    let app = express();
    let bodyParser = require('body-parser');

    // logging
    app.use(morgan('combined')); //'combined' outputs the Apache style LOGs

    //parse application/json and look for raw text
    app.use(bodyParser.json({ limit: '5mb' }));
    app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
    app.use(bodyParser.text());
    app.use(bodyParser.json({ limit: '5mb', type: 'application/json' }));

    // add middlewares
    app.use(RequestMiddleware.middleware); // adds a req._req

    if (Array.isArray(middlewares)) {
      middlewares.forEach((middleware) => app.use(middleware?.middleware || middleware));
    }

    // add routes
    if (!Array.isArray(routers)) {
      routers = [routers];
    }
    routers.forEach((route) => app.use(route));

    // listen
    app.listen(port);

    console.log('Web server Listening on port ' + port);

    return app;
  },
};

module.exports = { ...Public };
