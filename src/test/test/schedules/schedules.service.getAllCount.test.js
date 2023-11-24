const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const TestConstants = require('../../test-constants.js');
const SchedulesService = require('../../../services/schedules/schedules.service.js');

describe('Schedules Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Schedules' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllCount with success
   */
  it('should getAllCount with success', async () => {
    const testSchedules = _.cloneDeep(TestConstants.Schedules);

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getAllCount').callsFake(() => {
      console.log(`\nDbOpsUtils.getAllCount called\n`);
      return { status: 200, value: 1 };
    });

    // call
    let res = await SchedulesService.getAllCount({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: 1,
    });
  }).timeout(10000);

  /**
   * getAllCount failed no tenant
   */
  it('should getAllCount failed tenant', async () => {
    // call
    let res = await SchedulesService.getAllCount({ query: {} }, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);
});
