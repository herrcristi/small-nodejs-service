/**
 * Tests are evaluated in order
 */

// core tests
require('../core/test/core.all.tests.js');

// services tests
require('./test/index/index.all.tests.js');
require('./test/web-server/web-server.all.tests.js');

require('./test/schools/schools.all.tests.js');
require('./test/users/users.all.tests.js');
require('./test/events/events.all.tests.js');

require('./test/students/students.all.tests.js');
require('./test/professors/professors.all.tests.js');
require('./test/classes/classes.all.tests.js');
require('./test/locations/locations.all.tests.js');
require('./test/groups/groups.all.tests.js');

if (process.env.TEST_DB) {
  require('./test/functional/functional.all.tests.js');
}
