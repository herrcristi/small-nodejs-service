/**
 * Controllers tests
 *
 * include them in order
 */

// controller tests
require('./users.controller.all.test.js');

// rest tests
require('./users.rest.test.js');

// service tests
require('./users.service.getAllForReq.test.js');
require('./users.service.getAll.test.js');
require('./users.service.getAllCount.test.js');
require('./users.service.getAllByIDs.test.js');
require('./users.service.getOne.test.js');
require('./users.service.post.test.js');
require('./users.service.delete.test.js');
require('./users.service.put.test.js');
require('./users.service.patch.test.js');

require('./users.service.schema.test.js');
