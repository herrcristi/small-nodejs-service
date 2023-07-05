/**
 * Common utils
 */
const Public = {
  /**
   * sleep
   */
  sleep: async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};

module.exports = { ...Public };
