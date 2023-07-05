/**
 * Web server
 */
const morgan = require('morgan');

const Public = {
  /**
   * init a webserver
   */
  init: async (port, routers, _middlewares = null) => {
    console.log(`Init web server on port ${port}`);

    let express = require('express');
    let app = express();
    let bodyParser = require('body-parser');

    // logging
    app.use(morgan('combined')); //'combined' outputs the Apache style LOGs

    //parse application/json and look for raw text
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.text());
    app.use(bodyParser.json({ type: 'application/json' }));

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
