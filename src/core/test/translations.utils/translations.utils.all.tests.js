/**
 * Tests
 *
 * include them in order
 */
require('./translations.utils.string.test.js');
require('./translations.utils.email.test.js');
require('./translations.utils.number.test.js');
require('./translations.utils.addTranslations.test.js');

// this tests will override strings and emails
require('./translations.utils.initStrings.test.js');
require('./translations.utils.initEmails.test.js');
