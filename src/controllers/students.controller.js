/**
 * Students controller
 */

const Public = {
  /**
   * get all
   */
  getAll: (req, res, _next) => {
    try {
      console.log('Students get all called');
      // TODO
    } catch (e) {
      console.log(`Error occured. ${e.stack ? e.stack : e}`);
      res.status(500);
    } finally {
      res.end();
    }
  },
};

module.exports = { ...Public };
