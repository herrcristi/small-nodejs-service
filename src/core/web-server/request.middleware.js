/**
 * Context middleware
 */
const CommonUtils = require('../utils/common.utils.js');

const Public = {
  /**
   * context middlware
   */
  middleware: (req, res, next) => {
    // add _req to request
    req._req = {
      reqID: CommonUtils.uuidc(),
      lang: 'en',
    };

    let time = new Date();
    let call = `${req.method.toUpperCase()} ${req.path}`;

    res.on('finish', () => {
      console.log(`Request finished: ${call} -> Response: ${res.statusCode}. Time: ${new Date() - time} ms`);
    });

    res.on('close', () => {
      req._req.duration = new Date() - time;
      req._req.statusCode = res.statusCode;
      console.log(`Request closed  : ${call} -> Response: ${res.statusCode}. Time: ${req._req.duration} ms`);
    });

    console.log('Received call', call, req._req);
    next();
  },
};

module.exports = { ...Public };
