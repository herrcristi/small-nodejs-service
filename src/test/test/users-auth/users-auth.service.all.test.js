/**
 * Users service tests
 *
 * include them in order
 */
require('./users-auth.service.init.test.js');

require('./users-auth.service.post.test.js');
require('./users-auth.service.delete.test.js');
require('./users-auth.service.putPassword.test.js');
require('./users-auth.service.resetPassword.test.js');
require('./users-auth.service.invite.test.js');
require('./users-auth.service.validateResetToken.test.js');
require('./users-auth.service.putResetPassword.test.js');
require('./users-auth.service.putID.test.js');
require('./users-auth.service.patchPassword.test.js');
require('./users-auth.service.patchID.test.js');
require('./users-auth.service.patchUserSchool.test.js');
require('./users-auth.service.notification.test.js');

require('./users-auth.service.login.test.js');
require('./users-auth.service.logout.test.js');
require('./users-auth.service.validate.test.js');
