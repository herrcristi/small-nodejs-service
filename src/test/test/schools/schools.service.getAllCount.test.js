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
  const _ctx = { reqID: 'testReq', lang: 'en' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * get all count with success
   */
  it('should get all count with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubDbGetAllCount = sinon.stub(DbOpsUtils, 'getAllCount').callsFake((filter) => {
      console.log(`\nDbOpsUtils.getAllCount called\n`);
      return { value: 1 };
    });

    // call
    let res = await SchoolsService.getAllCount({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAllCount.callCount).to.equal(1);
    chai.expect(res.value).to.equal(1);
  }).timeout(10000);
});
