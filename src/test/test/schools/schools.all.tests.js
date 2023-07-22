/**
 * Controllers tests
 *
 * include them in order
 */

// controller tests
require('./schools.controller.getAll.test.js');
require('./schools.controller.getOne.test.js');
require('./schools.controller.post.test.js');
require('./schools.controller.delete.test.js');
require('./schools.controller.put.test.js');
require('./schools.controller.patch.test.js');

// rest tests
require('./schools.rest.test.js');

// service tests
require('./schools.service.getAllForReq.test.js');
require('./schools.service.getAll.test.js');
require('./schools.service.getAllCount.test.js');
require('./schools.service.getAllByIDs.test.js');
require('./schools.service.getOne.test.js');
require('./schools.service.post.test.js');
require('./schools.service.delete.test.js');
require('./schools.service.put.test.js');
require('./schools.service.patch.test.js');
