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
   * delete one with success
   */
  it('should delete one with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubDbDeleteOne = sinon.stub(DbOpsUtils, 'delete').callsFake(() => {
      console.log(`\nDbOpsUtils.delete called\n`);
      return { value: testSchool };
    });

    // call
    let res = await SchoolsService.delete(testSchool.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbDeleteOne.callCount).to.equal(1);
    chai.expect(res.value).to.deep.equal({ ...testSchool });
  }).timeout(10000);

  /**
   * delete one not found
   */
  it('should delete one not found', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubDbDeleteOne = sinon.stub(DbOpsUtils, 'delete').callsFake(() => {
      console.log(`\nDbOpsUtils.delete called\n`);
      return { value: null };
    });

    // call
    let res = await SchoolsService.delete(testSchool.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbDeleteOne.callCount).to.equal(1);
    chai.expect(res.value).to.equal(null);
  }).timeout(10000);

  /**
   * delete one failed
   */
  it('should delete one failed', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubDbDeleteOne = sinon.stub(DbOpsUtils, 'delete').callsFake((deleteObj) => {
      console.log(`\nDbOpsUtils.delete called\n`);
      return { error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await SchoolsService.delete(testSchool.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbDeleteOne.callCount).to.equal(1);
    chai.expect(res.error.message).to.include('Test error message');
  }).timeout(10000);
});
