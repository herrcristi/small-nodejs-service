/**
 * Request middleware
 */
const CommonUtils = require('../utils/common.utils.js');

const Public = {
  /**
   * Request middlware
   */
  middleware: (req, res, next) => {
    // add _req to request
    req._req = {
      tenantID: req.headers.tenantid,
      reqID: CommonUtils.uuidc(),
      lang: 'en',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      reqMethod: req.method?.toUpperCase(),
      reqUrl: req.originalUrl,
      reqPath: req.path,
      reqTime: new Date().toISOString(),
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
