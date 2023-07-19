/**
 * Communications service
 *
 * helps with communication between services
 * can be done in 2 ways, either direct or via rest calls
 */

const axios = require('axios');

const CommonUtils = require('./common.utils');
const RestApiUtils = require('./rest-api.utils');

const Private = {
  /**
   * services inside local prop will be called directly
   * { local: {
   *    'service1': service1,
   *    'service2': service2
   * } }
   */
  Config: null,

  /**
   * rest call
   * config: { serviceName, method, path, query?, body? }
   */
  restCall: async (config, _ctx) => {
    console.log(`Rest api call: ${JSON.stringify(config, null, 2)}`);

    let srvConfigUri = Private.Config.rest[config.serviceName];
    let srvUri = `${srvConfigUri.protocol || 'http'}://${srvConfigUri.host}:${srvConfigUri.port || 80}${
      srvConfigUri.path
    }${config.path}`;

    if (config.method.toUpperCase() === 'GET') {
      srvUri += `${config.query}`; // should contain `?`
    }

    console.log(`Current url to call: ${config.method} ${srvUri}`);

    // TODO service2service auth

    // call axios
    let time = new Date();
    try {
      let r = await axios({
        method: config.method,
        url: srvUri,
        headers: {
          'x-tenant-id': _ctx.tenantID,
          'x-request-id': _ctx.reqID,
          'x-lang': _ctx.lang,
          'x-forwarded-for': _ctx.ipAddress,
          'content-type': 'application/json',
        },
        body: config.body,
        timeout: 30000,
      });

      console.log(
        `Calling ${config.method} ${srvUri} returned status: ${r.status}, body: ${
          CommonUtils.isDebug() ? JSON.stringify(r.data).slice(0, 2000) : '***'
        }. Finished in ${new Date() - time} ms`
      );

      // failed
      if (r.status >= 300) {
        return {
          error: {
            message: `Calling ${config.method} ${srvUri} failed with status ${r.status}`,
          },
        };
      }

      // success
      return { value: r.data };
    } catch (e) {
      console.log(
        `Calling ${config.method} ${srvUri} failed: ${e.stack ? e.stack : e}. Finished in ${new Date() - time} ms`
      );
      return { error: { message: e.message, error: e } };
    }
  },
};

const Public = {
  /**
   * init
   * parse config and save it to be used later in calls
   */
  init: async (config) => {
    console.log(`Current communication config, local service: ${JSON.stringify(config, null, 2)}`);

    // save it
    Private.Config = config;
    Private.Config.local = Private.Config.local || {};
    Private.Config.rest = Private.Config.rest || {};
  },

  getConfig: async () => {
    return Private.Config;
  },

  /**
   * rest call
   * config: { serviceName, method, path, query?, body? }
   */
  restCall: async (config, _ctx) => {
    return await Private.restCall(config, _ctx);
  },

  /**
   * get all
   * queryParams should contain `?`
   */
  getAll: async (serviceName, queryParams, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      // convert query to mongo build filter: { filter, projection, limit, skip, sort }
      const filter = await RestApiUtils.buildMongoFilterFromReq({ query: queryParams }, null /* schema */, _ctx);
      if (filter.error) {
        return { status: 400, error: filter.error };
      }

      return await localService.getAll(filter, _ctx);
    }

    // TODO get in chunks
    let r = await Private.restCall({ serviceName, method: 'GET', path: '', query: queryParams }, _ctx);
    if (r.error) {
      return r;
    }
    return { value: r.value.data, meta: r.value.meta };
  },

  getAllByIDs: async (serviceName, ids, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      return await localService.getAllByIDs(ids, _ctx);
    }
    // TODO get in chunks
    return await Private.restCall({ serviceName, method: 'GET', path: '', query: `?id=${ids.join(',')}` }, _ctx);
  },

  /**
   * get one
   */
  getOne: async (serviceName, objID, _ctx) => {
    const localService = Private.Config.local[serviceName];
    if (localService) {
      return await localService.getOne(objID, _ctx);
    }
    return await Private.restCall({ serviceName, method: 'GET', path: `/${objID}` }, _ctx);
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
};

module.exports = { ...Public };
