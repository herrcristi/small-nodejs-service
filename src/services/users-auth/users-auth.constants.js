/**
 * Constants file
 */
const WebConstants = require('../../web-server/web-server.constants.js');

const Public = {
  // paths
  ApiPath: `${WebConstants.BaseApiPath}/users-auth`,
  ApiPathInternal: `${WebConstants.BaseApiPathInternal}/users-auth`,

  // service name
  ServiceName: 'users-auth',
  ServiceNameInternal: 'users-auth-internal',

  // the sessions and the emailed links: a record for each one, in their own collection
  SessionsServiceName: 'users-auth-sessions',

  // type
  Type: 'user-auth',

  // the session cookie (the token of the session)
  AuthToken: 'SmallApp-token',

  // the attributes of the session cookie: HttpOnly (the UI never reads it), for every path, SameSite from
  // SMALL_API_COOKIE_SAMESITE (one of the values, or the default); it expires with the session (TokenExpiresIn)
  AuthCookie: {
    Path: '/',
    SameSiteValues: ['strict', 'lax', 'none'],
    SameSiteDefault: 'lax',
  },

  // reset token reason
  ResetTokenType: {
    Signup: 'signup', // a new user is created and is invited to a school
    ResetPassword: 'reset-password', // user exists and resets password
  },

  // what a token is for: a session (the cookie) or a reset token (the emailed link, purpose = its ResetTokenType)
  TokenPurpose: {
    Session: 'session',
  },

  // how long a token is valid, in seconds (its record and the session cookie expire with it)
  TokenExpiresIn: {
    session: 12 * 60 * 60, // 12h
    'reset-password': 60 * 60, // 1h: the person asked for it and uses it now
    signup: 72 * 60 * 60, // 72h: an invitation can wait some days
  },

  // the limits of the sessions (besides TokenExpiresIn.session, the longest a session lasts)
  SessionLimits: {
    IdleTimeout: 30 * 60, // seconds without a request: the session ends (a computer left open)
    TouchInterval: 5 * 60, // seconds: the last use is saved at most this often (a write), so the idle time is this precise
    MaxPerUser: 10, // open sessions of a user: a new login ends the oldest ones
  },
};

module.exports = { ...Public };
