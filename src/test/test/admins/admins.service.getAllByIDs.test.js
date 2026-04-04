const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const AdminsService = require('../../../services/admins/admins.service.js');

describe('Admins Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Admins' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllByIDs with success
   */
  it('should getAllByIDs with success', async () => {
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdminsIDs = testAdmins.map((item) => item.id);

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake(() => {
      console.log(`\nDbOpsUtils.getAllByIDs called\n`);
      return { status: 200, value: [...testAdmins] };
    });

    // call
    let res = await AdminsService.getAllByIDs(testAdminsIDs, { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: [...testAdmins],
    });
  }).timeout(10000);

  /**
   * getAllByIDs failed no tenant
   */
  it('should getAllByIDs failed tenant', async () => {
    // call
    let res = await AdminsService.getAllByIDs([], {}, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);
});
