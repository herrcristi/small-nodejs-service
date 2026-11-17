/**
 * Request middleware
 */
const CommonUtils = require('../utils/common.utils.js');
const ValidationUtils = require('../utils/validation.utils.js');

const Public = {
  /**
   * Request middlware
   */
  middleware: (req, res, next) => {
    // add _ctx to request
    // the values from the headers are untrusted: they are used in queries, collection names and logs,
    // so only well formed ones are kept
    // userID, username and tenantName are NEVER taken from the headers of a request: they are set by the
    // authentication middlewares from the verified token (users and service to service)
    req._ctx = {
      tenantID: ValidationUtils.safeID(req.headers['x-tenant-id']),
      tenantName: undefined, // must be filled in middleware: users-auth and service2service
      reqID: ValidationUtils.safeID(req.headers['x-request-id']) || CommonUtils.uuidc(),
      lang: /^[a-z]{2}(-[A-Za-z]{2})?$/.test(req.headers['x-lang']) ? req.headers['x-lang'] : 'en',
      ipAddress: req.ip, // the client when 'trust proxy' is configured (never x-forwarded-for as it is sent)
      userID: undefined,
      username: undefined,
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

    console.log('\n\n----------------------------------------------------------------\n\n');
    console.log('\nReceived call', call, req._ctx);
    next();
  },
};

module.exports = { ...Public };
