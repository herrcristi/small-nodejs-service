const SchoolsConstants = require('./schools.constants.js');
const SchoolsDatabase = require('./schools.database.js');

const Public = {
  /**
   * Ensure the configured portal organization exists and remains active.
   */
  init: async () => {
    const id = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    const collection = await SchoolsDatabase.collection({ service: 'SchoolsSetup' });
    if (!collection) {
      return false;
    }

    const existing = await collection.findOne({ id });
    if (existing) {
      if (existing.status !== SchoolsConstants.Status.Active) {
        throw new Error('Portal school must remain active');
      }
      return true;
    }

    await collection.insertOne({
      id,
      name: 'Portal School',
      type: SchoolsConstants.Type,
      status: SchoolsConstants.Status.Active,
      description: 'Portal organization',
    });
    return true;
  },
};

module.exports = { ...Public };
