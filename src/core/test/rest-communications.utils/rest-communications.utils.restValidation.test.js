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

  // /**
  //  * restValidation with success
  //  */
  // it('should restValidation with success', async () => {
  //   // local config
  //   let serviceName = 'Service';
  //   let restConfig = {
  //     rest: {
  //       [serviceName]: {
  //         protocol: 'http',
  //         host: 'localhost',
  //         port: process.env.PORT, // see test.utils.js
  //         path: '/api/internal_v1/service',
  //       },
  //     },
  //   };

  //   // stub
  //   mockAxios.onPost().reply(200, true);

  //   // call
  //   await RestCommsUtils.init(restConfig);

  //   const config = {
  //     serviceName,
  //     method: 'POST',
  //     path: '/login',
  //     body: { id: 'email@test.com', password: 'password' },
  //   };
  //   let res = await RestCommsUtils.restValidation(config, _ctx);
  //   console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

  //   chai.expect(res).to.deep.equal({
  //     status: 200,
  //     value: true,
  //   });
  // }).timeout(10000);

  // /**
  //  * restValidation with failure
  //  */
  // it('should restValidation with failure', async () => {
  //   // local config
  //   let serviceName = 'Service';
  //   let restConfig = {
  //     rest: {
  //       [serviceName]: {
  //         protocol: 'http',
  //         host: 'localhost',
  //         port: process.env.PORT, // see test.utils.js
  //         path: '/api/internal_v1/service',
  //       },
  //     },
  //   };

  //   // stub
  //   mockAxios.onPost().reply(500, {});

  //   // call
  //   await RestCommsUtils.init(restConfig);

  //   const config = {
  //     serviceName,
  //     method: 'POST',
  //     path: '/login',
  //     body: { id: 'email@test.com', password: 'password' },
  //   };
  //   let res = await RestCommsUtils.restValidation(config, _ctx);
  //   console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

  //   chai
  //     .expect(res.error.message)
  //     .to.include('Calling POST http://localhost:8080/api/internal_v1/service/login failed with status 500');
  // }).timeout(10000);
});
