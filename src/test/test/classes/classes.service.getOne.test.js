const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const ClassesService = require('../../../services/classes/classes.service.js');

describe('Classes Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Classes' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake(() => {
      console.log(`\nDbOpsUtils.getOne called\n`);
      return { status: 200, value: { ...testClass } };
    });

    // call
    let res = await ClassesService.getOne(testClass.id, { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testClass },
    });
  }).timeout(10000);

  /**
   * getOne failed no tenant
   */
  it('should getOne failed tenant', async () => {
    // call
    let res = await ClassesService.getOne('id', {}, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);
});
