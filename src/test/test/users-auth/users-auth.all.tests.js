/**
 * Controllers tests
 *
 * include them in order
 */

// controller tests
require('./users-auth.controller.all.test.js');
require('./users-auth.signup.controller.all.test.js');

// rest tests
require('./users-auth.rest.test.js');

// service tests
require('./users-auth.service.all.test.js');
require('./users-auth.signup.service.all.test.js');

// schema tests
require('./users-auth.service.schema.test.js');
