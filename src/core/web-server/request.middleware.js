/**
 * Request middleware
 */
const CommonUtils = require('../utils/common.utils.js');

const Public = {
  /**
   * Request middlware
   */
  middleware: (req, res, next) => {
    // add _ctx to request
    req._ctx = {
      tenantID: req.headers['x-tenant-id'],
      tenantName: undefined, // must be filled in middleware: users-auth and service2service
      reqID: req.headers['x-request-id'] || CommonUtils.uuidc(),
      lang: req.headers['x-lang'] || 'en',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userID: req.headers['x-user-id'],
      username: req.headers['x-user-name'],
      reqMethod: req.method?.toUpperCase(),
      reqUrl: req.originalUrl,
      reqPath: req.path,
      reqTime: new Date().toISOString(),
    };

    let time = new Date();
    let call = `${req.method.toUpperCase()} ${req.path}`;

    res.on('finish', () => {
      console.log(`\nRequest finished: ${call} -> Response: ${res.statusCode}. Time: ${new Date() - time} ms`);
    });

    res.on('close', () => {
      req._ctx.duration = new Date() - time;
      req._ctx.statusCode = res.statusCode;
      console.log(`\nRequest closed  : ${call} -> Response: ${res.statusCode}. Time: ${req._ctx.duration} ms`);
    });

    console.log('\nReceived call', call, req._ctx);
    next();
  },
};

module.exports = { ...Public };
