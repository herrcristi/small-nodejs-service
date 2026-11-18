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

  // type
  Type: 'user-auth',

  // token
  AuthToken: 'SmallApp-token',

  // reset token reason
  ResetTokenType: {
    Signup: 'signup', // a new user is created and is invited to a school
    ResetPassword: 'reset-password', // user exists and resets password
  },

  // what a token is for: a session (the cookie) or a reset token (the emailed link, purpose = its ResetTokenType)
  TokenPurpose: {
    Session: 'session',
  },

  // how long a token is valid
  TokenExpiresIn: {
    session: '12h',
    'reset-password': '1h', // the person asked for it and uses it now
    signup: '72h', // an invitation can wait some days
  },
};

module.exports = { ...Public };
