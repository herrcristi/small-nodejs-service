/**
 * Controllers tests
 *
 * include them in order
 */

require('./functional.database.test.js');

require('./functional.schools.test.js');

require('./functional.users.test.js');

require('./functional.classes.test.js');
require('./functional.locations.test.js');
require('./functional.groups.test.js');
require('./functional.schedules.test.js');

// TODO add tests for signup+invite and login+validate + logout (and routes)
