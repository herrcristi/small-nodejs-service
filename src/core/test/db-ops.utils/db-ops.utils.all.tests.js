/**
 * Tests
 *
 * include them in order
 */
require('./db-ops.array.utils.getPullBulkOpsFromArray.test.js');
require('./db-ops.array.utils.getPushBulkOpsFromArray.test.js');

require('./db-ops.utils.getAll.test.js');
require('./db-ops.utils.getAllCount.test.js');
require('./db-ops.utils.getAllByIDs.test.js');
require('./db-ops.utils.getOne.test.js');
require('./db-ops.utils.post.test.js');
require('./db-ops.utils.delete.test.js');
require('./db-ops.utils.put.test.js');
require('./db-ops.utils.patch.test.js');

require('./db-ops.utils.addManyReferences.test.js');
require('./db-ops.utils.updateManyReferences.test.js');
require('./db-ops.utils.deleteManyReferences.test.js');
