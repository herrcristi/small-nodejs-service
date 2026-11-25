/**
 * the settings of the application from its environment (see src/.env.example), with their defaults
 * the core (src/core) is a library that other applications can share: it never reads the environment of this
 * application, it receives these settings
 */
const Public = {
  // how long a pending user (an invitation that was not used) or a pending school (a signup without a login) is kept,
  // in seconds: 72 hours by default (as long as the setup link of an invitation)
  PendingExpiresIn: 72 * 60 * 60,

  /**
   * how long a pending user or a pending school is kept, in seconds: SMALL_API_PENDING_EXPIRES_IN (a positive whole
   * number of seconds), PendingExpiresIn otherwise
   */
  getPendingExpiresIn: () => {
    const seconds = Number(process.env.SMALL_API_PENDING_EXPIRES_IN);
    return Number.isInteger(seconds) && seconds > 0 ? seconds : Public.PendingExpiresIn;
  },

  // the names of SMALL_API_DATABASE_LIMITS and the limits of the database manager they set
  DatabaseLimitNames: {
    connections: 'maxPoolSize', // the connections of a process to each member of the replica set
    connwaitmax: 'waitQueueTimeout', // how long a request waits for a free connection, in seconds
    timeout: 'queryTimeout', // how long a database call may run, in seconds
  },

  // the names whose value is a time in seconds, written with or without the unit ('30s' or '30')
  DatabaseLimitTimes: ['connwaitmax', 'timeout'],

  /**
   * the limits of the database (core/utils/database-manager): SMALL_API_DATABASE_LIMITS is
   * 'connections=16;connwaitmax=30s;timeout=30s' (any of them, in any order, separated by ';' or ','); the database
   * manager checks the values and uses its defaults for the missing or wrong ones (16 connections, 30 s, 30 s); an
   * unknown name is logged and ignored
   */
  getDatabaseLimits: () => {
    const limits = {};
    const settings = `${process.env.SMALL_API_DATABASE_LIMITS || ''}`.split(/[;,]/);
    for (const setting of settings) {
      const [name, value = ''] = setting.split('=');
      const key = name.trim();
      if (!key) {
        continue;
      }
      if (!Object.hasOwn(Public.DatabaseLimitNames, key)) {
        console.log(`\nSMALL_API_DATABASE_LIMITS: unknown name '${key}' is ignored`);
        continue;
      }

      // a time: the seconds, without the unit
      const isTime = Public.DatabaseLimitTimes.includes(key);
      const text = value.trim();
      limits[Public.DatabaseLimitNames[key]] = isTime ? text.replace(/s$/, '') : text;
    }
    return limits;
  },

  // the fields of SMALL_API_LEGAL_CONFIG: the operator of the application, named in its legal documents (the end user
  // license agreement, the terms and conditions, the privacy policy)
  LegalFields: ['name', 'address', 'email', 'country'],

  /**
   * the operator of the application, named in its legal documents: SMALL_API_LEGAL_CONFIG is a JSON object
   * { name, address, email, country } (the legal name, the address, the contact email, the country of the governing law)
   * returns { value: { name, address, email, country }, problems: [ text ] }: the fields that are missing or empty are
   * problems (the start refuses them in production) and are shown as their name in brackets ([name])
   */
  getLegalSettings: () => {
    const problems = [];
    let config = {};
    try {
      config = JSON.parse(process.env.SMALL_API_LEGAL_CONFIG || '{}') || {};
    } catch (e) {
      problems.push('Env var SMALL_API_LEGAL_CONFIG is not a JSON object');
    }

    const value = {};
    for (const field of Public.LegalFields) {
      const text = typeof config[field] === 'string' ? config[field].trim() : '';
      if (!text) {
        problems.push(`Env var SMALL_API_LEGAL_CONFIG has no ${field} (the operator named in the legal documents)`);
      }
      value[field] = text || `[${field}]`;
    }
    return { value, problems };
  },

  /**
   * the settings of the web server (core/web-server): the origins allowed by CORS (SMALL_API_CORS_ORIGIN, a list
   * separated by commas, and the url of the api SMALL_API_URL, the Origin of the calls between services), the proxies
   * in front of it (SMALL_API_TRUST_PROXY) and the rate limits (SMALL_API_RATE_LIMIT_*); the web server checks them and
   * uses its defaults for the missing ones
   */
  getWebServerSettings: () => {
    const corsOrigins = `${process.env.SMALL_API_CORS_ORIGIN || ''}`.split(',');
    corsOrigins.push(`${process.env.SMALL_API_URL || ''}`);
    return {
      corsOrigins,
      trustProxy: process.env.SMALL_API_TRUST_PROXY,
      rateLimits: {
        max: process.env.SMALL_API_RATE_LIMIT_MAX,
        loginMax: process.env.SMALL_API_RATE_LIMIT_LOGIN_MAX,
        loginAccountMax: process.env.SMALL_API_RATE_LIMIT_LOGIN_ACCOUNT_MAX,
        resetMax: process.env.SMALL_API_RATE_LIMIT_RESET_MAX,
      },
    };
  },
};

module.exports = { ...Public };
