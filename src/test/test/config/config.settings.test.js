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
    'SMALL_API_URL',
    'SMALL_API_LEGAL_CONFIG',
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
    process.env.SMALL_API_URL = 'https://api.testdomain.test';
    process.env.SMALL_API_TRUST_PROXY = '1';
    process.env.SMALL_API_RATE_LIMIT_MAX = '500';
    process.env.SMALL_API_RATE_LIMIT_LOGIN_MAX = '4';
    process.env.SMALL_API_RATE_LIMIT_LOGIN_ACCOUNT_MAX = '10';
    process.env.SMALL_API_RATE_LIMIT_RESET_MAX = '2';

    // call
    const settings = ConfigSettings.getWebServerSettings();

    // check: the origins of the UI, and the url of the api (the Origin of the calls between services)
    chai.expect(settings).to.deep.equal({
      corsOrigins: ['https://ui.testdomain.test', 'https://admin.testdomain.test', 'https://api.testdomain.test'],
      trustProxy: '1',
      rateLimits: { max: '500', loginMax: '4', loginAccountMax: '10', resetMax: '2' },
    });

    // case: nothing configured (the web server uses its defaults)
    for (const name of names) {
      delete process.env[name];
    }
    const empty = ConfigSettings.getWebServerSettings();
    chai.expect(empty.corsOrigins).to.deep.equal(['', '']);
    chai.expect(empty.trustProxy).to.equal(undefined);
  }).timeout(10000);

  /**
   * the operator named in the legal documents: the fields of SMALL_API_LEGAL_CONFIG (trimmed); a missing or empty
   * field, or a value that is not a JSON object, is a problem and the field is shown as its name in brackets
   */
  it('should get the operator of the legal documents', async () => {
    // case: all the fields
    const operator = {
      name: ' Example SRL ',
      address: 'Street 1, City',
      email: 'legal@example.test',
      country: 'Romania',
    };
    process.env.SMALL_API_LEGAL_CONFIG = JSON.stringify(operator);
    const res = ConfigSettings.getLegalSettings();
    chai.expect(res.problems).to.deep.equal([]);
    chai.expect(res.value).to.deep.equal({ ...operator, name: 'Example SRL' });

    // case: a field missing, empty, or not a text
    for (const wrong of [{ name: undefined }, { address: ' ' }, { email: 1 }]) {
      process.env.SMALL_API_LEGAL_CONFIG = JSON.stringify({ ...operator, ...wrong });
      const resWrong = ConfigSettings.getLegalSettings();
      const field = Object.keys(wrong)[0];
      chai.expect(resWrong.problems.length, field).to.equal(1);
      chai.expect(resWrong.problems[0]).to.include(field);
      chai.expect(resWrong.value[field]).to.equal(`[${field}]`);
    }

    // case: not set, not JSON, not an object: every field is missing
    for (const value of [undefined, 'not json', '[]', 'null']) {
      if (value === undefined) {
        delete process.env.SMALL_API_LEGAL_CONFIG;
      } else {
        process.env.SMALL_API_LEGAL_CONFIG = value;
      }
      const resNone = ConfigSettings.getLegalSettings();
      chai.expect(resNone.problems.length, `${value}`).to.be.at.least(ConfigSettings.LegalFields.length);
      chai.expect(resNone.value.name).to.equal('[name]');
    }
  }).timeout(10000);
});
