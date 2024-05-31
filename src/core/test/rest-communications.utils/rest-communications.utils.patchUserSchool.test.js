const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const RestCommsUtils = require('../../utils/rest-communications.utils.js');
const JwtUtils = require('../../utils/jwt.utils.js');

describe('Rest Communications Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  let currentConfig = null;
  let mockAxios = null;

  before(async function () {});

  beforeEach(async function () {
    mockAxios = new MockAdapter(axios);
    currentConfig = await RestCommsUtils.getConfig();
    sinon.stub(JwtUtils, 'encrypt').returns({ status: 200, value: 's2stoken' });
  });

  afterEach(async function () {
    mockAxios?.restore();
    sinon.restore();
    RestCommsUtils.init(currentConfig);
  });

  after(async function () {});

  /**
   * patchUserSchool local with success
   */
  it('should call patchUserSchool local with success', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          patchUserSchool: sinon.stub().callsFake((adminID, userID, patchInfo) => {
            return {
              status: 200,
              value: {
                id: userID,
                name: 'name',
                type: 'type',
              },
            };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    let res = await RestCommsUtils.patchUserSchool(serviceName, 'id1', 'userID1', { set: { roles: ['admin'] } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].patchUserSchool.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: 'userID1',
        name: 'name',
        type: 'type',
      },
    });
  }).timeout(10000);

  /**
   * patchUserSchool local fail
   */
  it('should call patchUserSchool local and fail', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          patchUserSchool: sinon.stub().callsFake((adminID, userID, patchInfo) => {
            return { error: { message: 'Test error message', error: new Error('Test error').toString() } };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    let res = await RestCommsUtils.patchUserSchool(serviceName, 'id1', 'userID1', { set: { roles: ['admin'] } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].patchUserSchool.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      error: {
        error: 'Error: Test error',
        message: 'Test error message',
      },
    });
  }).timeout(10000);

  /**
   * patchUserSchool remote with success
   */
  it('should call patchUserSchool remote with success', async () => {
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
    mockAxios.onPatch().reply((config) => {
      chai.expect(config.method).to.equal('patch');
      chai.expect(config.url).to.equal('http://localhost:8080/api/v1/service/id1/school/user/userID1');

      return [200, { id: 'userID1', name: 'name', type: 'type' }];
    });

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.patchUserSchool(serviceName, 'id1', 'userID1', { set: { roles: ['admin'] } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: 'userID1',
        name: 'name',
        type: 'type',
      },
    });
  }).timeout(10000);

  /**
   * patchUserSchool remote with failure
   */
  it('should call patchUserSchool remote with failure', async () => {
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

    let res = await RestCommsUtils.patchUserSchool(serviceName, 'id1', 'userID1', { set: { roles: ['admin'] } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai
      .expect(res.error.message)
      .to.include('Calling PATCH http://localhost:8080/api/v1/service/id1/school/user/userID1 failed with status 500');
  }).timeout(10000);
});
