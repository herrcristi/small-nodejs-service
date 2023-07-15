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
   * post one with success
   */
  it('should post one with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const postReq = {
      ...testSchool,
      id: undefined,
    };

    // stub
    let stubDbPostOne = sinon.stub(DbOpsUtils, 'post').callsFake((postObj) => {
      console.log(`\nDbOpsUtils.post called\n`);
      return { value: { ...postObj, id: testSchool.id } };
    });

    // call
    let res = await SchoolsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbPostOne.callCount).to.equal(1);
    chai.expect(res.value).to.deep.equal({ ...testSchool });
  }).timeout(10000);

  /**
   * post one with success with default status
   */
  it('should post one with success with default status', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const postReq = {
      ...testSchool,
      id: undefined,
      status: undefined,
    };

    // stub
    let stubDbPostOne = sinon.stub(DbOpsUtils, 'post').callsFake((postObj) => {
      console.log(`\nDbOpsUtils.post called\n`);
      return { value: { ...postObj, id: testSchool.id } };
    });

    // call
    let res = await SchoolsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbPostOne.callCount).to.equal(1);
    chai.expect(res.value).to.deep.equal({ ...testSchool, status: SchoolsConstants.Status.Pending });
  }).timeout(10000);

  /**
   * post one failed
   */
  it('should post one failed', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const postReq = {
      ...testSchool,
      id: undefined,
    };

    // stub
    let stubDbPostOne = sinon.stub(DbOpsUtils, 'post').callsFake((postObj) => {
      console.log(`\nDbOpsUtils.post called\n`);
      return { error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await SchoolsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbPostOne.callCount).to.equal(1);
    chai.expect(res.error.message).to.include('Test error message');
  }).timeout(10000);
});
