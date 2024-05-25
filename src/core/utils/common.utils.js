/**
 * Common utils
 */
const crypto = require('crypto');

const Public = {
  /**
   * sleep
   */
  sleep: async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * is debug
   */
  isDebug: () => {
    return ['dev', 'test', 'development'].includes(process.env.NODE_ENV);
  },

  /**
   * uuid
   */
  uuid: () => {
    return crypto.randomUUID();
  },

  uuidc: () => {
    // compact uppercase uuid
    return crypto.randomUUID().toUpperCase().replaceAll('-', '');
  },

  /**
   * capitalize
   */
  capitalize: (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },

  /**
   * random bytes
   */
  getRandomBytes: (bytes = 32) => {
    return crypto.randomBytes(bytes).toString('hex');
  },

  /**
   * hash string using a salt
   */
  getHash: (string, salt) => {
    return crypto.scryptSync(string, salt, 64).toString('hex');
  },

  /**
   * encrypt
   * pasword must be 256 bits (32 characters)
   * iv For AES, this is always 16
   */
  encrypt: (data, password, iv = crypto.randomBytes(16)) => {
    let cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(password), iv, { authTagLength: 16 });
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString('hex');
  },

  /**
   * decrypt
   * pasword must be 256 bits (32 characters)
   */
  decrypt: (encryptedHex, password) => {
    try {
      let encrypted = Buffer.from(encryptedHex, 'hex');

      const iv = Uint8Array.prototype.slice.call(encrypted, 0, 16);
      const encryptedMessage = Uint8Array.prototype.slice.call(encrypted, 16, -16);
      const authTag = Uint8Array.prototype.slice.call(encrypted, -16);

      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(password), iv, { authTagLength: 16 });
      decipher.setAuthTag(authTag);
      let data = decipher.update(encryptedMessage);
      data = Buffer.concat([data, decipher.final()]);
      return data.toString();
    } catch (e) {
      return { error: { message: e.message, error: e } };
    }
  },

  /**
   * stringify a regexp
   */
  stringifyFilter: (key, value) => {
    return value instanceof RegExp ? value.toString() : value;
  },

  /**
   * split array in chunks
   * 0 -> [1, 2, 3] -> [ [1, 2, 3] ]
   * 1 -> [1, 2, 3] -> [ [1], [2], [3] ]
   * 2 -> [1, 2, 3] -> [ [1, 2], [3] ]
   */
  getChunks: (array, chunkSize) => {
    if (!array.length) {
      return [];
    }

    if (chunkSize === 0) {
      return [array];
    }

    let chunks = [];
    let currentChunk = [];
    for (const elem of array) {
      if (currentChunk.length === 0) {
        chunks.push(currentChunk);
      }

      currentChunk.push(elem);

      if (currentChunk.length === chunkSize) {
        currentChunk = [];
      }
    }

    return chunks;
  },

  /**
   * hide sensitive data
   */
  protectData: (obj) => {
    if (obj === undefined) {
      return undefined;
    }
    if (obj === null) {
      return null;
    }

    let newObj = { ...obj };
    delete newObj.password;
    delete newObj.newPassword;
    delete newObj.oldPassword;
    delete newObj.salt;

    if (newObj.set) {
      newObj.set = Public.protectData(newObj.set);
    }

    return newObj;
  },

  /**
   * get projected object
   */
  getProjectedObj: (obj, projection) => {
    if (obj === undefined) {
      return undefined;
    }
    if (obj === null) {
      return null;
    }

    let objProjected = {};

    for (const field in projection) {
      // TODO split obj[field] by .
      if (projection[field] && obj[field] !== undefined) {
        objProjected[field] = obj[field];
      }
    }

    return objProjected;
  },

  /**
   * convert obj to patch
   * { "a": { "b":1 } } to { "a.b": 1 }
   */
  obj2patch: (obj) => {
    if (Array.isArray(obj) || typeof obj !== 'object') {
      return obj;
    }

    let r = {};
    for (const key in obj) {
      const val = obj[key];
      const newVal = Public.obj2patch(val);

      if (Array.isArray(newVal) || typeof newVal !== 'object') {
        r[key] = newVal;
      } else {
        for (const innerKey in newVal) {
          r[`${key}.${innerKey}`] = newVal[innerKey];
        }
      }
    }

    return r;
  },

  /**
   * convert patch to obj
   * { "a.b": 1 } to { "a": { "b":1 } }
   */
  patch2obj: (obj) => {
    if (Array.isArray(obj) || typeof obj !== 'object') {
      return obj;
    }

    let r = {};
    for (const key in obj) {
      const val = obj[key];

      // split key
      const multiKeys = key.split('.');

      let p = r;
      for (let i = 0; i < multiKeys.length - 1; ++i) {
        const keySegment = multiKeys[i];

        const valSegm = p[keySegment];
        if (!valSegm || Array.isArray(valSegm) || typeof valSegm !== 'object') {
          p[keySegment] = {};
        }
        p = p[keySegment];
      }

      // add last key segment with value
      const lastKeySegment = multiKeys[multiKeys.length - 1];
      p[lastKeySegment] = Public.patch2obj(val);
    }

    return r;
  },

  /**
   * has conflicting members (if same member appear in multiple fields) used by patch
   * ex: [{ field1 }, {field2 }, { field3 }, { field4 }]
   */
  hasCommonFields: (objs) => {
    if (!Array.isArray(objs)) {
      return false;
    }

    let fieldsMap = {};
    for (const currentObj of objs) {
      for (const field of Object.keys(currentObj)) {
        if (fieldsMap[field]) {
          return true;
        }
        fieldsMap[field] = 1;
      }
    }

    return false;
  },

  /**
   * get log for error
   */
  getLogError: (e) => {
    if (e?.stack) {
      return e.stack;
    }
    return typeof e === 'string' ? e : JSON.stringify(e);
  },
};

module.exports = { ...Public };
