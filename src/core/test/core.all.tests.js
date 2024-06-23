/**
 * Core tests
 *
 * include test files in order
 */
require('./common.utils/common.utils.all.tests.js');

require('./jwt.utils/jwt.utils.all.tests.js');

require('./rest-api.utils/rest-api.utils.all.tests.js');
require('./rest-messages.utils/rest-messages.utils.all.tests.js');
require('./rest-communications.utils/rest-communications.utils.all.tests.js');

require('./base-service.utils/base-service.utils.all.tests.js');
require('./base-service.references.utils/base-service.references.utils.all.tests.js');
require('./base-service.notifications.utils/base-service.notifications.utils.all.tests.js');

require('./translations.utils/translations.utils.all.tests.js');

require('./db-ops.utils/db-ops.utils.all.tests.js');
require('./database-manager.utils/database-manager.utils.all.tests.js');

require('./emails.utils/emails.utils.all.test.js');
require('./web-server.utils/web-server.utils.all.tests.js');
