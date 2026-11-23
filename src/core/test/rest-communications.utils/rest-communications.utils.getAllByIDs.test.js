const _ = require('lodash');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const DbOpsUtils = require('../../utils/db-ops.utils.js');
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
   * getAllByIDs local with success
   */
  it('should call getAllByIDs local with success', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          getAllByIDs: sinon.stub().callsFake((ids, projection) => {
            return {
              status: 200,
              value: [
                {
                  id: 'id1',
                },
              ],
            };
          }),
        },
      },
    };

    // call: with the options of the read
    await RestCommsUtils.init(localConfig);
    const options = { readPreference: DbOpsUtils.Constants.ReadPrimary };
    let res = await RestCommsUtils.getAllByIDs(serviceName, ['id1'], { id: 1 }, _ctx, options);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the options go to the local service
    chai.expect(localConfig.local[serviceName].getAllByIDs.callCount).to.equal(1);
    chai.expect(localConfig.local[serviceName].getAllByIDs.firstCall.args[3]).to.deep.equal(options);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: [
        {
          id: 'id1',
        },
      ],
    });
  }).timeout(10000);

  /**
   * getAllByIDs local fail
   */
  it('should call getAllByIDs local and fail', async () => {
    // local config
    let serviceName = 'Service';
    let localConfig = {
      local: {
        [serviceName]: {
          getAllByIDs: sinon.stub().callsFake((ids, projection) => {
            return { error: { message: 'Test error message', error: new Error('Test error').toString() } };
          }),
        },
      },
    };

    // call
    await RestCommsUtils.init(localConfig);
    let res = await RestCommsUtils.getAllByIDs(serviceName, ['id1'], { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(localConfig.local[serviceName].getAllByIDs.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      error: {
        error: 'Error: Test error',
        message: 'Test error message',
      },
    });
  }).timeout(10000);

  /**
   * getAllByIDs remote with success
   */
  it('should call getAllByIDs remote with success', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      rest: {
        [serviceName]: {
          protocol: 'http',
          host: 'localhost',
          port: process.env.SMALL_API_PORT, // see test/test-setup.utils.js
          path: '/api/v1/service',
        },
      },
    };

    // stub
    mockAxios.onGet().reply(200, {
      data: [{ id: 'id1', name: 'name' }],
      meta: { count: 1, limit: 0, skip: 0 },
    });

    // call
    await RestCommsUtils.init(restConfig);

    const options = { readPreference: DbOpsUtils.Constants.ReadPrimary };
    let res = await RestCommsUtils.getAllByIDs(serviceName, ['id1'], { id: 1, name: 1 }, _ctx, options);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the options of the read are in the service token (only a service sets them)
    chai.expect(JwtUtils.encrypt.firstCall.args[0].options).to.deep.equal(options);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: [
        {
          id: 'id1',
          name: 'name',
        },
      ],
    });
  }).timeout(10000);

  /**
   * getAllByIDs remote with failure
   */
  it('should call getAllByIDs remote with failure', async () => {
    // local config
    let serviceName = 'Service';
    let restConfig = {
      rest: {
        [serviceName]: {
          protocol: 'http',
          host: 'localhost',
          port: process.env.SMALL_API_PORT, // see test/test-setup.utils.js
          path: '/api/v1/service',
        },
      },
    };

    const configUrl = `http://localhost:${process.env.SMALL_API_PORT}`;

    // stub
    mockAxios.onGet().reply(500, {});

    // call
    await RestCommsUtils.init(restConfig);

    let res = await RestCommsUtils.getAllByIDs(serviceName, ['id1'], null, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res.error.message).to.include(`Calling GET ${configUrl}/api/v1/service?id=id1 failed with status 500`);
  }).timeout(10000);
});
