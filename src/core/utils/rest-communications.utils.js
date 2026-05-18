/**
 * Communications service
 *
 * helps with communication between services
 * can be done in 2 ways, either direct or via rest calls
 */

const axios = require('axios');

const CommonUtils = require('./common.utils.js');
const RestApiUtils = require('./rest-api.utils.js');
const JwtUtils = require('./jwt.utils.js');

const Constants = {
  Timeout: 30000 /* 30s */,
};

const Private = {
  /**
   * services inside local prop will be called directly
   * {
   *   issuer,
   *   s2sPass,
   *   local: {
   *    'service1': service1,
   *    'service2': service2
   * },
   * rest: {
   *    'service1': { protocol, host, port, path }
   *  }} }
   */
  Config: null,

  /**
   * rest call
   * config: { serviceName, method, path, query?, body?, headers? }
   */
  restCall: async (config, _ctx) => {
    console.log(`\nRest api call: ${JSON.stringify(CommonUtils.protectData(config), null, 2)}`);

    let srvConfigUri = Private.Config.rest[config.serviceName];
    if (!srvConfigUri) {
      return {
        status: 400,
        error: { message: `No service ${config.serviceName}`, error: new Error(`No service ${config.serviceName}`) },
      };
    }
    let srvUri = `${srvConfigUri.protocol || 'https'}://${srvConfigUri.host}:${srvConfigUri.port || 80}${
      srvConfigUri.path
    }${config.path}`;

    config.method = config.method?.toUpperCase();
    if (config.method === 'GET' && config.query) {
      srvUri += `?${config.query}`;
    }

    console.log(`\nCurrent url to call: ${config.method} ${srvUri}`);

    let time = new Date();

    // service2service auth
    const s2sData = {
      _ctx, // original ctx
      method: config.method.toUpperCase(),
      url: srvUri,
      timestamp: time.toISOString(),
    };
    const s2sToken = JwtUtils.encrypt(s2sData, Private.Config.issuer, _ctx, Private.Config.s2sPass);

    // call axios
    try {
      let r = await axios({
        method: config.method,
        url: srvUri,
        headers: {
          ...config.headers,
          'x-tenant-id': _ctx.tenantID,
          'x-tenant-name': _ctx.tenantName,
          'x-request-id': _ctx.reqID,
          'x-lang': _ctx.lang,
          'x-forwarded-for': _ctx.ipAddress,
          'x-user-id': _ctx.userID,
          'x-user-name': _ctx.username,
          'x-s2s-token': s2sToken.value,
          'content-type': 'application/json',
        },
        data: config.body,
        timeout: config.timeout || Constants.Timeout,
        validateStatus: (status) => config.validateStatus /*for testing*/ ?? true /* dont throw exception*/,
      });

      console.log(
        `\nCalling ${config.method} ${srvUri} returned status: ${r.status}, body: ${
          CommonUtils.isDebug() ? JSON.stringify(r.data || '').slice(0, 2000) : '***'
        }. Finished in ${new Date() - time} ms`
      );

      // failed
      if (r.status >= 300) {
        return {
          status: r.status,
          error: {
            message: `Calling ${config.method} ${srvUri} failed with status ${r.status}`,
            error: new Error(`Calling ${config.method} ${srvUri} failed with status ${r.status}`),
          },
        };
      }

      // success
      return { status: r.status, value: r.data };
    } catch (e) {
      console.log(`\nCalling ${config.method} ${srvUri} failed: ${e?.message}. Finished in ${new Date() - time} ms`);

      return { status: 500, error: { message: e?.message, error: e?.message } };
    }
  },
};

const Public = {
  /**
   * init
   * parse config and save it to be used later in calls
   */
  init: async (config) => {
    // save it
    Private.Config = config;
    Private.Config.local = Private.Config.local || {};
    Private.Config.rest = Private.Config.rest || {};

    console.log(`\nCurrent communication config, local service: ${JSON.stringify(Object.keys(config.local), null, 2)}`);
    console.log(`\nCurrent communication config, remote service: ${JSON.stringify(config.rest, null, 2)}`);
  },

  getConfig: async () => {
    return Private.Config;
  },

  /**
   * rest call
   * config: { serviceName, method, path, query?, body?, headers? }
   */
  restCall: async (config, _ctx) => {
    return await Private.restCall(config, _ctx);
  },

  /**
   * rest call validation for s2s token
   */
  restValidation: (s2sToken, _ctx) => {
    // decode
    const rs = JwtUtils.decrypt(s2sToken, Private.Config.issuer, _ctx, [Private.Config.s2sPass]);
    if (rs.error) {
      return rs;
    }

    // check expiration
    const s2sData = rs.value;
    const expiredTime = new Date(s2sData.timestamp).getTime() + 60 * 1000; /*1m*/
    if (expiredTime < new Date().getTime()) {
      const msg = 'Token is expired';
      return { status: 401, error: { message: msg, error: new Error(msg) } };
    }

    _ctx.initialMethod = s2sData._ctx.initialMethod || s2sData._ctx.reqMethod;
    _ctx.initialUrl = s2sData._ctx.initialUrl || s2sData._ctx.reqUrl;
    _ctx.callerMethod = s2sData._ctx.reqMethod;
    _ctx.callerUrl = s2sData._ctx.reqUrl;

    // some properties should be kept from original request
    _ctx.tenantID = s2sData._ctx.tenantID;
    _ctx.reqID = s2sData._ctx.reqID;
    _ctx.lang = s2sData._ctx.lang;
    _ctx.ipAddress = s2sData._ctx.ipAddress;
    _ctx.userID = s2sData._ctx.userID;
    _ctx.username = s2sData._ctx.username;

    console.log('\nS2S received call', _ctx);

    return { status: 200, value: s2sData };
  },

  /**
   * call either local or rest
   * config: { serviceName, method, path, query?, body?, headers?, localCall:{ fn, params?: {} } }
   * examples
   *  login  body: { id, password }
   *  logout body: { }
   *  signup body: { email, password, name, birthday, phoneNumber?, address, school: { name, description } },
   *  invite body: { email, school: { role } } - schoolID is _ctx.tenantID
   */
  call: async (config, _ctx) => {
    const localService = Private.Config.local[config.serviceName];
    if (localService) {
      return await localService[config.localCall.fn](...Object.values(config.localCall.params || {}), _ctx);
    }
    return await Private.restCall(config, _ctx);
  },

  /**
   * get all
   * queryParams
   */
  getAll: async (serviceName, queryParams, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      // convert query to mongo build filter: { filter, projection, limit, skip, sort }
      const rf = await RestApiUtils.buildFilterFromReq({ query: queryParams }, null /* schema */, _ctx);
      if (rf.error) {
        return rf;
      }
      const filter = rf.value;

      return await localService.getAll(filter, _ctx);
    }

    // TODO get in chunks
    let r = await Private.restCall({ serviceName, method: 'GET', path: '', query: queryParams }, _ctx);
    if (r.error) {
      return r;
    }
    return { status: 200, value: r.value.data, meta: r.value.meta };
  },

  /**
   * get all by ids with projection
   * projection: {id:1, name:1, ...}
   */
  getAllByIDs: async (serviceName, ids, projection, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      return await localService.getAllByIDs(ids, projection, _ctx);
    }

    let query = ``;
    if (projection) {
      query += `projection=${Object.keys(projection).join(',')}&`;
    }

    //  get in chunks due to limited size of url
    let data = [];
    const chunks = CommonUtils.getChunks(ids, 50);
    for (const chunkIDs of chunks) {
      const chunkQuery = `${query}id=${chunkIDs.join(',')}`;
      let r = await Private.restCall({ serviceName, method: 'GET', path: '', query: chunkQuery }, _ctx);
      if (r.error) {
        return r;
      }
      data = data.concat(r.value.data);
    }

    return { status: 200, value: data };
  },

  /**
   * get one
   */
  getOne: async (serviceName, objID, projection, _ctx) => {
    const config = {
      serviceName,
      method: 'GET',
      path: `/${objID}`,
      query: projection ? `projection=${Object.keys(projection).join(',')}` : '',
      localCall: { fn: 'getOne', params: { objID, projection } },
    };
    return await Public.call(config, _ctx);
  },

  /**
   * post
   */
  post: async (serviceName, objInfo, _ctx) => {
    const config = {
      serviceName,
      method: 'POST',
      path: '',
      body: objInfo,
      localCall: { fn: 'post', params: { objInfo } },
    };
    return await Public.call(config, _ctx);
  },

  /**
   * delete
   */
  delete: async (serviceName, objID, _ctx) => {
    const config = {
      serviceName,
      method: 'DELETE',
      path: `/${objID}`,
      localCall: { fn: 'delete', params: { objID } },
    };
    return await Public.call(config, _ctx);
  },

  /**
   * put
   */
  put: async (serviceName, objID, objInfo, _ctx, field = '') => {
    const localFn = `put${field === 'id' ? 'ID' : CommonUtils.capitalize(field)}`; // put, putID, putPassword etc
    const extraPath = field ? `/${field}` : ''; // '', '/id', '/password' etc

    const config = {
      serviceName,
      method: 'PUT',
      path: `/${objID}${extraPath}`,
      body: objInfo,
      localCall: { fn: localFn, params: { objID, objInfo } },
    };
    return await Public.call(config, _ctx);
  },

  /**
   * patch
   */
  patch: async (serviceName, objID, patchInfo, _ctx, field = '') => {
    const localFn = `patch${field === 'id' ? 'ID' : CommonUtils.capitalize(field)}`; // patch, patchID, patchPassword, etc
    const extraPath = field ? `/${field}` : ''; // '', '/id', '/password', etc

    const config = {
      serviceName,
      method: 'PATCH',
      path: `/${objID}${extraPath}`,
      body: patchInfo,
      localCall: { fn: localFn, params: { objID, patchInfo } },
    };
    return await Public.call(config, _ctx);
  },

  /**
   * notification
   * notification: { serviceName, added?, modified?, removed? }
   */
  notification: async (serviceName, notification, _ctx) => {
    const config = {
      serviceName,
      method: 'POST',
      path: '/notifications',
      body: notification,
      localCall: { fn: 'notification', params: { notification } },
    };
    return await Public.call(config, _ctx);
  },

  /**
   * validate
   * objInfo: { method, route, token }
   */
  validate: async (serviceName, objInfo, cookieTokenName, _ctx) => {
    const config = {
      serviceName,
      method: 'GET',
      path: '/validate',
      query: `method=${objInfo.method}&route=${encodeURIComponent(objInfo.route)}`,
      headers: {
        cookie: `${cookieTokenName}=${objInfo.token}`,
        authorization: `Bearer ${objInfo.token}`,
      },
      localCall: { fn: 'validate', params: { objInfo } },
    };
    return await Public.call(config, _ctx);
  },
};

module.exports = { ...Public };
