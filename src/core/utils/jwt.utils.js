/**
 * Jwt utils
 */
const jwt = require('jsonwebtoken');

const CommonUtils = require('./common.utils');

const Private = {
  // will be initialized on init for a issuer
  JwtPasswords: {}, // passwords to sign the jwt, (keep last 2 due to rotation)

  /**
   * rotate jwt passwords
   */
  rotateJwtPassords: (issuer) => {
    console.log(`\nGenerating a new jwt password for ${issuer}`);

    Private.JwtPasswords[issuer] ??= [];
    Private.JwtPasswords[issuer].push(CommonUtils.getRandomBytes(32)); // add a random password
    Private.JwtPasswords[issuer] = Private.JwtPasswords[issuer].slice(-2); // keep only last 2
  },
};

const Public = {
  /**
   * init
   */
  init: async (issuer) => {
    Private.rotateJwtPassords(issuer);

    setInterval(() => {
      Private.rotateJwtPassords(issuer); // rotate passwords every day, interval must be greater than or equal to jwt expiration
    }, 24 * 60 * 60 * 1000);
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
      { algorithm: 'HS512', expiresIn: '1d', issuer }
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
