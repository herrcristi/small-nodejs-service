const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const CommonUtils = require('../../utils/common.utils.js');
const RestMessagesUtils = require('../../utils/rest-messages.utils.js');
const RestCommsUtils = require('../../utils/rest-communications.utils.js');
const RestControllerUtils = require('../../utils/rest-controller.utils.js');
const RestApiUtils = require('../../utils/rest-api.utils.js');

describe('Rest Communications Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  let currentConfig = null;
  let mockAxios = null;

  before(async function () {});

  beforeEach(async function () {
    mockAxios = new MockAdapter(axios);
    currentConfig = await RestCommsUtils.getConfig();
  });

  afterEach(async function () {
    mockAxios?.restore();
    sinon.restore();
    RestCommsUtils.init(currentConfig);
  });

  after(async function () {});

  /**
   * rest call remote with success
   */
  it('should rest call remote with success', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      rest: {
        [serviceName]: {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT, // see test.utils.js
          path: '/api/v1/service',
        },
      },
    };

    // stub
    mockAxios.onPatch().reply(200, {
      id: 'id1',
      name: 'name',
      type: 'type',
    });

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.restCall(
      {
        serviceName,
        method: 'patch',
        path: '/id1',
        body: { set: { name: 'name' } },
      },
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: 'id1',
        name: 'name',
        type: 'type',
      },
    });
  }).timeout(10000);

  /**
   * rest call success with defaults
   */
  it('should rest call success with defaults', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      rest: {
        [serviceName]: {
          host: 'localhost',
          path: '/api/v1/service',
        },
      },
    };

    // stub
    mockAxios.onPatch().reply(200, {
      id: 'id1',
      name: 'name',
      type: 'type',
    });

    sinon.stub(CommonUtils, 'isDebug').returns(false);

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.restCall(
      {
        serviceName,
        method: 'patch',
        path: '/id1',
        body: { set: { name: 'name' } },
      },
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: 'id1',
        name: 'name',
        type: 'type',
      },
    });
  }).timeout(10000);

  /**
   * rest call fail service not found
   */
  it('should rest call fail service not found', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      rest: {},
    };

    // stub
    mockAxios.onPatch().reply(200, {
      id: 'id1',
      name: 'name',
      type: 'type',
    });

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.restCall(
      {
        serviceName,
        method: 'patch',
        path: '/id1',
        body: { set: { name: 'name' } },
      },
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('No service Service');
  }).timeout(10000);

  /**
   * rest call fail
   */
  it('should rest call fail', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      rest: {
        [serviceName]: {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT, // see test.utils.js
          path: '/api/v1/service',
        },
      },
    };

    // stub
    mockAxios.onPatch().reply(500, {});

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.restCall(
      {
        serviceName,
        method: 'patch',
        path: '/id1',
        body: { set: { name: 'name' } },
      },
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai
      .expect(res.error.message)
      .to.include('Calling PATCH http://localhost:8080/api/v1/service/id1 failed with status 500');
  }).timeout(10000);

  /**
   * rest call fail with exception
   */
  it('should rest call fail with exception', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      rest: {
        [serviceName]: {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT, // see test.utils.js
          path: '/api/v1/service',
        },
      },
    };

    // stub
    mockAxios.onPatch().reply(500, {});

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.restCall(
      {
        serviceName,
        method: 'patch',
        path: '/id1',
        body: { set: { name: 'name' } },
        validateStatus: false, // to throw exception
      },
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res.error.message).to.include('Request failed with status code 500');
  }).timeout(10000);
});
