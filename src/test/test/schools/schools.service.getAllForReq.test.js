const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils');

const TestConstants = require('../../test-constants.js');
const SchoolsConstants = require('../../../services/schools/schools.constants.js');
const SchoolsService = require('../../../services/schools/schools.service.js');

describe('Schools Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Schools' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllForReq with success
   */
  it('should get all with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubDbGetAll = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: [...testSchools],
          meta: { count: testSchools.length },
        },
      };
    });

    // call
    let res = await SchoolsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAll.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        data: [...testSchools],
        meta: { count: testSchools.length },
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq failed
   */
  it('should getAllForReq failed', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubDbGetAll = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchoolsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAll.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);
});
