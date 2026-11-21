/**
 * Schools setup service
 */
const SchoolsConstants = require('./schools.constants.js');
const SchoolsRest = require('../rest/schools.rest.js');
const EventsRest = require('../rest/events.rest.js');

const Public = {
  /**
   * ensure the configured portal school exists and remains active
   */
  init: async () => {
    const id = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    // the events of the start are done by the setup user
    const setupUser = EventsRest.Constants.NoLoginUsers.Setup;
    const _ctx = { reqID: 'SchoolsSetup', lang: 'en', userID: setupUser, username: setupUser };
    const existing = await SchoolsRest.getOne(id, { id: 1, status: 1 }, _ctx);

    if (!existing.error) {
      if (existing.value.status !== SchoolsConstants.Status.Active) {
        throw new Error('Portal school must remain active');
      }
      return true;
    }

    if (existing.status !== 404) {
      throw new Error(existing.error.message || 'Failed to load portal school');
    }

    const created = await SchoolsRest.post(
      {
        id,
        name: 'Portal School',
        status: SchoolsConstants.Status.Active,
        description: 'Portal organization',
      },
      _ctx
    );
    if (created.error) {
      throw new Error(created.error.message || 'Failed to create portal school');
    }

    return true;
  },
};

module.exports = { ...Public };
