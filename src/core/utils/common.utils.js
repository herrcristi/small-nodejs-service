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
    let newObj = { ...obj };
    delete newObj.password;

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
};

module.exports = { ...Public };
