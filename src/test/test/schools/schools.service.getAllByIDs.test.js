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
   * get all by ids with success
   */
  it('should get all by ids with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchoolsIDs = testSchools.map((item) => item.id);

    // stub
    let stubDbGetAllByIDs = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake((filter) => {
      console.log(`\nDbOpsUtils.getAllByIDs called\n`);
      return { value: testSchools };
    });

    // call
    let res = await SchoolsService.getAllByIDs(testSchoolsIDs, { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAllByIDs.callCount).to.equal(1);
    chai.expect(res.value).to.deep.equal([...testSchools]);
  }).timeout(10000);

  /**
   * get all by ids failed
   */
  it('should get all by ids failed', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchoolsIDs = testSchools.map((item) => item.id);

    // stub
    let stubDbGetAllByIDs = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake((filter) => {
      console.log(`\nDbOpsUtils.getAllByIDs called\n`);
      return { error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await SchoolsService.getAllByIDs(testSchoolsIDs, { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAllByIDs.callCount).to.equal(1);
    chai.expect(res.error.message).to.deep.include('Test error message');
  }).timeout(10000);
});
