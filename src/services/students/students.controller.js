/**
 * Students controller
 */
const StudentConstants = require('./students.constants');

const Public = {
  /**
   * get all
   */
  getAll: (req, res, _next) => {
    try {
      console.log('Students get all called');

      res.status(200).json({ data: [] });
    } catch (e) {
      console.log(`Error occured. ${e.stack ? e.stack : e}`);
      res.status(500);
    } finally {
      res.end();
    }
  },
};

module.exports = { ...Public };
