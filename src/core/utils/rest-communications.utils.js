/**
 * Communications service
 *
 * helps with communication between services
 * can be done in 2 ways, either direct or via rest calls
 */

const Axios = require('axios');

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
   * config: { service, method, path, params?, data? }
   */
  restCall: async (config, _ctx) => {
    console.log(`Rest api call: ${JSON.stringify(config, null, 2)}`);
    // TODO axios + service2service auth

    return { error: { message: 'Not implemented', error: new Error('Not implemented') } };
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
  },

  /**
   * get all
   * filter: { filter, projection, limit, skip, sort }
   */
  getAll: async (service, filter, _ctx) => {
    const localService = Private.Config.local[service];
    if (localService) {
      return await localService.getAll(filter, _ctx);
    }
    return await Private.restCall({ service, method: 'GET', path: '/', params: filter }, _ctx);
  },

  getAllByIDs: async (service, ids, _ctx) => {
    const localService = Private.Config.local[service];
    if (localService) {
      return await localService.getAllByIDs(ids, _ctx);
    }
    return await Private.restCall({ service, method: 'GET', path: '/', params: { id: ids.join(',') } }, _ctx);
  },

  /**
   * get one
   */
  getOne: async (service, objID, _ctx) => {
    const localService = Private.Config.local[service];
    if (localService) {
      return await localService.getOne(objID, _ctx);
    }
    return await Private.restCall({ service, method: 'GET', path: `/${objID}` }, _ctx);
  },

  /**
   * post
   */
  post: async (service, objInfo, _ctx) => {
    const localService = Private.Config.local[service];
    if (localService) {
      return await localService.post(objInfo, _ctx);
    }
    return await Private.restCall({ service, method: 'POST', path: '/', data: objInfo }, _ctx);
  },

  /**
   * delete
   */
  delete: async (service, objID, _ctx) => {
    const localService = Private.Config.local[service];
    if (localService) {
      return await localService.delete(objID, _ctx);
    }
    return await Private.restCall({ service, method: 'DELETE', path: `/${objID}` }, _ctx);
  },

  /**
   * put
   */
  put: async (service, objID, objInfo, _ctx) => {
    const localService = Private.Config.local[service];
    if (localService) {
      return await localService.put(objID, objInfo, _ctx);
    }
    return await Private.restCall({ service, method: 'PUT', path: `/${objID}`, data: objInfo }, _ctx);
  },

  /**
   * patch
   */
  patch: async (service, objID, patchInfo, _ctx) => {
    const localService = Private.Config.local[service];
    if (localService) {
      return await localService.patch(objID, patchInfo, _ctx);
    }
    return await Private.restCall({ service, method: 'PATCH', path: `/${objID}`, data: patchInfo }, _ctx);
  },
};

module.exports = { ...Public };
