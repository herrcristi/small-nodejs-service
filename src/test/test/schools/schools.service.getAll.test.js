const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils');

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
   * get all with success
   */
  it('should get all with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubDbGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((filter) => {
      console.log(`\nDbOpsUtils.getAll called\n`);
      return { value: testSchools };
    });

    // call
    let res = await SchoolsService.getAll({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAll.callCount).to.equal(1);
    chai.expect(res.value).to.deep.equal([...testSchools]);
  }).timeout(10000);

  /**
   * get all failed
   */
  it('should get all failed', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubDbGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((filter) => {
      console.log(`\nDbOpsUtils.getAll called\n`);
      return { error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await SchoolsService.getAll({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAll.callCount).to.equal(1);
    chai.expect(res.error.message).to.deep.include('Test error message');
  }).timeout(10000);
});
