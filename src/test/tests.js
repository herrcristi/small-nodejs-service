/**
 * Tests are evaluated in order
 */

// core tests
require('../core/test/core.all.tests.js');

// services tests
require('./test/index/index.all.tests.js');

require('./test/schools/schools.all.tests.js');
require('./test/users/users.all.tests.js');
require('./test/events/events.all.tests.js');

require('./test/students/students.all.tests.js');

if (process.env.TEST_DB) {
  console.log('\nDoing functional+database tests\n');
  require('./test/functional/functional.all.tests.js');
}
