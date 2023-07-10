/**
 * Tests are evaluated in order
 */

// core tests
require('../core/test/core.all.tests.js');

// services tests
require('./test/services.users/users.all.tests.js');
require('./test/services.students/students.all.tests.js');
