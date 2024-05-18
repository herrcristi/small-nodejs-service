/**
 * Communications service
 *
 * helps with communication between services
 * can be done in 2 ways, either direct or via rest calls
 */

const axios = require('axios');

const CommonUtils = require('./common.utils.js');
const RestApiUtils = require('./rest-api.utils.js');

const Constants = {
  Timeout: 30000 /* 30s */,
};

const Private = {
  /**
   * services inside local prop will be called directly
   * { local: {
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
    console.log(`\nRest api call: ${JSON.stringify(config, null, 2)}`);

    let srvConfigUri = Private.Config.rest[config.serviceName];
    if (!srvConfigUri) {
      return {
        status: 400,
        error: { message: `No service ${config.serviceName}`, error: new Error(`No service ${config.serviceName}`) },
      };
    }
    let srvUri = `${srvConfigUri.protocol || 'http'}://${srvConfigUri.host}:${srvConfigUri.port || 80}${
      srvConfigUri.path
    }${config.path}`;

    config.method = config.method?.toUpperCase();
    if (config.method === 'GET' && config.query) {
      srvUri += `?${config.query}`;
    }

    console.log(`\nCurrent url to call: ${config.method} ${srvUri}`);

    // TODO service2service auth

    // call axios
    let time = new Date();
    try {
      let r = await axios({
        method: config.method,
        url: srvUri,
        headers: {
          ...config.headers,
          'x-tenant-id': _ctx.tenantID,
          'x-request-id': _ctx.reqID,
          'x-lang': _ctx.lang,
          'x-forwarded-for': _ctx.ipAddress,
          'x-user-id': _ctx.userID,
          'x-user-name': _ctx.username,
          'content-type': 'application/json',
        },
        data: config.body,
        timeout: config.timeout || Constants.Timeout,
        validateStatus: (status) => config.validateStatus /*for testing*/ ?? true /* dont throw exception*/,
      });

      console.log(
        `\nCalling ${config.method} ${srvUri} returned status: ${r.status}, body: ${
          CommonUtils.isDebug() ? JSON.stringify(r.data).slice(0, 2000) : '***'
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
    const localService = Private.Config.local[serviceName];
    if (localService) {
      return await localService.getOne(objID, projection, _ctx);
    }
    const queryParams = projection ? `projection=${Object.keys(projection).join(',')}` : '';
    return await Private.restCall({ serviceName, method: 'GET', path: `/${objID}`, query: queryParams }, _ctx);
  },

  /**
   * post
   */
  post: async (serviceName, objInfo, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      return await localService.post(objInfo, _ctx);
    }
    return await Private.restCall({ serviceName, method: 'POST', path: '', body: objInfo }, _ctx);
  },

  /**
   * delete
   */
  delete: async (serviceName, objID, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      return await localService.delete(objID, _ctx);
    }
    return await Private.restCall({ serviceName, method: 'DELETE', path: `/${objID}` }, _ctx);
  },

  /**
   * put
   */
  put: async (serviceName, objID, objInfo, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      return await localService.put(objID, objInfo, _ctx);
    }
    return await Private.restCall({ serviceName, method: 'PUT', path: `/${objID}`, body: objInfo }, _ctx);
  },

  /**
   * patch
   */
  patch: async (serviceName, objID, patchInfo, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      return await localService.patch(objID, patchInfo, _ctx);
    }
    return await Private.restCall({ serviceName, method: 'PATCH', path: `/${objID}`, body: patchInfo }, _ctx);
  },

  /**
   * notification
   */
  notification: async (serviceName, notification, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      return await localService.notification(notification, _ctx);
    }
    return await Private.restCall({ serviceName, method: 'POST', path: '/notifications', body: notification }, _ctx);
  },

  /**
   * login
   */
  login: async (serviceName, objInfo, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      return await localService.login(objInfo, _ctx);
    }
    return await Private.restCall({ serviceName, method: 'POST', path: '/login', body: objInfo }, _ctx);
  },

  /**
   * signup
   */
  signup: async (serviceName, objInfo, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      return await localService.signup(objInfo, _ctx);
    }
    return await Private.restCall({ serviceName, method: 'POST', path: '/signup', body: objInfo }, _ctx);
  },

  /**
   * validate
   * objInfo: { method, route, token, cookie }
   */
  validate: async (serviceName, objInfo, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      return await localService.validate({ method: objInfo.method, route: objInfo.route, token: objInfo.token }, _ctx);
    }

    const cookie = objInfo.cookie;
    const queryParams = `method=${objInfo.method}&route=${encodeURIComponent(objInfo.route)}`;

    return await Private.restCall(
      { serviceName, method: 'GET', path: '/validate', query: queryParams, headers: { cookie } },
      _ctx
    );
  },
};

module.exports = { ...Public };
