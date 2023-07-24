/**
 * Controllers tests
 *
 * include them in order
 */

// controller tests
require('./users.controller.getAll.test.js');
require('./users.controller.getOne.test.js');
require('./users.controller.post.test.js');
require('./users.controller.delete.test.js');
require('./users.controller.put.test.js');
require('./users.controller.patch.test.js');

// rest tests
require('./users.rest.test.js');
