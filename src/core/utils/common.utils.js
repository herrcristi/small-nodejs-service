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
};

module.exports = { ...Public };
