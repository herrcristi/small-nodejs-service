/**
 * Jwt utils
 */
const jwt = require('jsonwebtoken');

const CommonUtils = require('./common.utils');

const Private = {
  // will be initialized on init for a issuer
  JwtPasswords: {}, // passwords to sign the jwt
};

const Public = {
  /**
   * init
   */
  init: async (issuer, passwords /*oldest first, newest last */) => {
    if (!Array.isArray(passwords)) {
      throw new Error(`Password required for issuer ${issuer}`);
    }

    if (passwords.some((item) => item.length != 32)) {
      throw new Error(`Password must  have 32 bytes for issuer ${issuer}`);
    }

    Private.JwtPasswords[issuer] = passwords;
  },

  /**
   * encrypt
   */
  encrypt: (data, issuer, _ctx, password = undefined, iv = undefined) => {
    if (!password) {
      password = Private.JwtPasswords[issuer].at(-1);
    }
    const dataText = JSON.stringify({ data, issuer });
    return CommonUtils.encrypt(dataText, Buffer.from(password), iv);
  },

  /**
   * decrypt
   */
  decrypt: (encrypted, issuer, _ctx, passwords = undefined) => {
    if (!passwords) {
      passwords = [...Private.JwtPasswords[issuer]].reverse();
    }

    for (const pass of passwords) {
      try {
        let rd = CommonUtils.decrypt(encrypted, Buffer.from(pass));
        if (rd.error) {
          continue;
        }

        const decoded = JSON.parse(rd.value);
        // decoded: { data, issuer }

        // validate issuer
        if (decoded.issuer !== issuer) {
          throw new Error('Invalid issuer');
        }

        return { status: 200, value: decoded.data };
      } catch (e) {
        console.log(`\nFailed to decrypt: ${e.stack}`);
      }
    }

    const msg = 'Cannot decrypt data';
    return { status: 401, error: { message: msg, error: new Error(msg) } };
  },

  /**
   * get the jwt
   */
  getJwt: (data, issuer, _ctx) => {
    const jwtToken = jwt.sign(
      {
        data,
      },
      Private.JwtPasswords[issuer].at(-1),
      { algorithm: 'HS512', expiresIn: '12h', issuer }
    );

    return { status: 200, value: jwtToken };
  },

  /**
   * validate the jwt and return data
   * jwtToken: { data }
   */
  validateJwt: (jwtToken, issuer, _ctx) => {
    const passwords = [...Private.JwtPasswords[issuer]].reverse();

    for (const pass of passwords) {
      try {
        const decodedJwtToken = jwt.verify(jwtToken, pass, { algorithms: 'HS512', issuer });

        // decoded: { data, iat, exp, iss }

        return { status: 200, value: decodedJwtToken.data };
      } catch (e) {
        console.log(`\nFailed to verify jwt: ${e.stack}`);
      }
    }

    const msg = 'Invalid jwt';
    return { status: 401, error: { message: msg, error: new Error(msg) } };
  },
};

module.exports = {
  ...Public,
};
