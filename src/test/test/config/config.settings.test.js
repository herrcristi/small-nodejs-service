const chai = require('chai');

const ConfigSettings = require('../../../services/config.settings.js');

describe('Config Settings', function () {
  // the settings changed by these tests, restored after each one
  const names = [
    'SMALL_API_PENDING_EXPIRES_IN',
    'SMALL_API_CORS_ORIGIN',
    'SMALL_API_TRUST_PROXY',
    'SMALL_API_RATE_LIMIT_MAX',
    'SMALL_API_RATE_LIMIT_LOGIN_MAX',
    'SMALL_API_RATE_LIMIT_LOGIN_ACCOUNT_MAX',
    'SMALL_API_RATE_LIMIT_RESET_MAX',
    'SMALL_API_DATABASE_LIMITS',
  ];
  const saved = {};

  before(async function () {});

  beforeEach(async function () {
    for (const name of names) {
      saved[name] = process.env[name];
    }
  });

  afterEach(async function () {
    for (const name of names) {
      if (saved[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = saved[name];
      }
    }
  });

  after(async function () {});

  /**
   * the expiry of the pending users and schools, in seconds: the configured value, 72 hours by default (also for a
   * value that is not a positive whole number)
   */
  it('should get the expiry of the pending users and schools', async () => {
    // case: not configured
    delete process.env.SMALL_API_PENDING_EXPIRES_IN;
    chai.expect(ConfigSettings.getPendingExpiresIn()).to.equal(72 * 60 * 60);

    // case: configured (one day)
    process.env.SMALL_API_PENDING_EXPIRES_IN = '86400';
    chai.expect(ConfigSettings.getPendingExpiresIn()).to.equal(86400);

    // case: not a positive whole number
    for (const value of ['0', '-60', '1.5', 'three days']) {
      process.env.SMALL_API_PENDING_EXPIRES_IN = value;
      chai.expect(ConfigSettings.getPendingExpiresIn(), value).to.equal(ConfigSettings.PendingExpiresIn);
    }
  }).timeout(10000);

  /**
   * the limits of the database: 'connections=16;connwaitmax=30s;timeout=30s', named, in any order; the times in seconds
   * with or without the unit; given to the database manager, which checks the values (and uses its defaults for the
   * missing or wrong ones); an unknown name is ignored
   */
  it('should get the limits of the database', async () => {
    // case: not configured
    delete process.env.SMALL_API_DATABASE_LIMITS;
    chai.expect(ConfigSettings.getDatabaseLimits()).to.deep.equal({});

    // case: all of them
    process.env.SMALL_API_DATABASE_LIMITS = 'connections=16;connwaitmax=30s;timeout=30s';
    chai
      .expect(ConfigSettings.getDatabaseLimits())
      .to.deep.equal({ maxPoolSize: '16', waitQueueTimeout: '30', queryTimeout: '30' });

    // case: another order, with spaces, separated by a comma, a time without the unit
    process.env.SMALL_API_DATABASE_LIMITS = ' timeout = 10 , connections = 8 ;';
    chai.expect(ConfigSettings.getDatabaseLimits()).to.deep.equal({ queryTimeout: '10', maxPoolSize: '8' });

    // case: an unknown name (ignored), a name without a value, a wrong value (checked by the database manager)
    process.env.SMALL_API_DATABASE_LIMITS = 'connwait=5s;timeout;connections=many;constructor=1';
    chai.expect(ConfigSettings.getDatabaseLimits()).to.deep.equal({ queryTimeout: '', maxPoolSize: 'many' });
  }).timeout(10000);

  /**
   * the settings of the web server come from the environment of the application (the core does not read it)
   */
  it('should get the settings of the web server', async () => {
    // stub: the environment
    process.env.SMALL_API_CORS_ORIGIN = 'https://ui.testdomain.test,https://admin.testdomain.test';
    process.env.SMALL_API_TRUST_PROXY = '1';
    process.env.SMALL_API_RATE_LIMIT_MAX = '500';
    process.env.SMALL_API_RATE_LIMIT_LOGIN_MAX = '4';
    process.env.SMALL_API_RATE_LIMIT_LOGIN_ACCOUNT_MAX = '10';
    process.env.SMALL_API_RATE_LIMIT_RESET_MAX = '2';

    // call
    const settings = ConfigSettings.getWebServerSettings();

    // check
    chai.expect(settings).to.deep.equal({
      corsOrigins: ['https://ui.testdomain.test', 'https://admin.testdomain.test'],
      trustProxy: '1',
      rateLimits: { max: '500', loginMax: '4', loginAccountMax: '10', resetMax: '2' },
    });

    // case: nothing configured (the web server uses its defaults)
    for (const name of names) {
      delete process.env[name];
    }
    const empty = ConfigSettings.getWebServerSettings();
    chai.expect(empty.corsOrigins).to.deep.equal(['']);
    chai.expect(empty.trustProxy).to.equal(undefined);
  }).timeout(10000);
});
