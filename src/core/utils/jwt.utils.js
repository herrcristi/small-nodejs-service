/**
 * Jwt utils
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const CommonUtils = require('./common.utils');

const Private = {
  // will be initialized on init for a issuer
  // the keys derived from the passwords (oldest first): one key to sign the jwt and another one to encrypt
  // (a key is never used for two algorithms)
  JwtKeys: {},

  /**
   * derive the sign and the encrypt keys of a password (HKDF, the issuer as salt)
   */
  deriveKeys: (password, issuer) => {
    const signKey = crypto.hkdfSync('sha512', password, issuer, 'jwt-sign', 64);
    const encryptKey = crypto.hkdfSync('sha256', password, issuer, 'jwt-encrypt', 32);
    return { sign: Buffer.from(signKey), encrypt: Buffer.from(encryptKey) };
  },
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

    Private.JwtKeys[issuer] = passwords.map((password) => Private.deriveKeys(password, issuer));
  },

  /**
   * encrypt
   */
  encrypt: (data, issuer, _ctx, password = undefined, iv = undefined) => {
    // a provided password is used as it is (the service to service password), otherwise the derived encrypt key
    const key = password ? Buffer.from(password) : Private.JwtKeys[issuer].at(-1).encrypt;
    const dataText = JSON.stringify({ data, issuer });
    return CommonUtils.encrypt(dataText, key, iv);
  },

  /**
   * decrypt
   */
  decrypt: (encrypted, issuer, _ctx, passwords = undefined) => {
    // provided passwords are used as they are, otherwise the derived encrypt keys (newest first)
    const keys = passwords
      ? passwords.map((pass) => Buffer.from(pass))
      : [...Private.JwtKeys[issuer]].reverse().map((item) => item.encrypt);

    for (const key of keys) {
      try {
        let rd = CommonUtils.decrypt(encrypted, key);
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
      Private.JwtKeys[issuer].at(-1).sign,
      { algorithm: 'HS512', expiresIn: '12h', issuer }
    );

    return { status: 200, value: jwtToken };
  },

  /**
   * validate the jwt and return data
   * jwtToken: { data }
   */
  validateJwt: (jwtToken, issuer, _ctx) => {
    const keys = [...Private.JwtKeys[issuer]].reverse().map((item) => item.sign);

    for (const key of keys) {
      try {
        const decodedJwtToken = jwt.verify(jwtToken, key, { algorithms: ['HS512'], issuer });

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
