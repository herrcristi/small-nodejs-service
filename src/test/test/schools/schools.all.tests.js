/**
 * Controllers tests
 *
 * include them in order
 */

// controller tests
require('./schools.controller.all.test.js');

// rest tests
require('./schools.rest.test.js');

// service tests
require('./schools.service.all.test.js');
require('./schools.setup.service.test.js');
require('./schools.signup.service.all.test.js');

// schema tests
require('./schools.service.schema.test.js');
require('./schools.signup.service.schema.test.js');
