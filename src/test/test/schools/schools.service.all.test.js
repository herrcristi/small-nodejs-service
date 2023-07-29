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
  it('should getAllForReq with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
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
    chai.expect(stubBase.callCount).to.equal(1);
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
    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake(() => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchoolsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * getAll with success
   */
  it('should getAll with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAll').callsFake(() => {
      console.log(`\nBaseServiceUtils.getAll called\n`);
      return { status: 200, value: testSchools };
    });

    // call
    let res = await SchoolsService.getAll({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: testSchools,
    });
  }).timeout(10000);

  /**
   * getAllCount with success
   */
  it('should getAllCount with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllCount').callsFake(() => {
      console.log(`\nBaseServiceUtils.getAllCount called\n`);
      return { status: 200, value: 1 };
    });

    // call
    let res = await SchoolsService.getAllCount({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: 1,
    });
  }).timeout(10000);

  /**
   * getAllByIDs with success
   */
  it('should getAllByIDs with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchoolsIDs = testSchools.map((item) => item.id);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllByIDs').callsFake(() => {
      console.log(`\nBaseServiceUtils.getAllByIDs called\n`);
      return { status: 200, value: [...testSchools] };
    });

    // call
    let res = await SchoolsService.getAllByIDs(testSchoolsIDs, { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: [...testSchools],
    });
  }).timeout(10000);

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getOne').callsFake(() => {
      console.log(`\nBaseServiceUtils.getOne called\n`);
      return { status: 200, value: { ...testSchool } };
    });

    // call
    let res = await SchoolsService.getOne(testSchool.id, { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testSchool },
    });
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const postReq = {
      ...testSchool,
      id: undefined,
      type: undefined,
    };

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'post').callsFake((config, postObj) => {
      console.log(`\nBaseServiceUtils.post called\n`);
      return {
        status: 201,
        value: { ...postObj, id: testSchool.id },
      };
    });

    // call
    let res = await SchoolsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: { ...testSchool },
    });
  }).timeout(10000);

  /**
   * post with success with defaults
   */
  it('should post with success with defaults', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const postReq = {
      ...testSchool,
      id: undefined,
      type: undefined,
      status: undefined,
    };

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'post').callsFake((config, postObj) => {
      console.log(`\nBaseServiceUtils.post called\n`);
      return {
        status: 201,
        value: { ...postObj, id: testSchool.id },
      };
    });

    // call
    let res = await SchoolsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        ...testSchool,
        status: SchoolsConstants.Status.Pending,
      },
    });
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'delete').callsFake(() => {
      console.log(`\nBaseServiceUtils.delete called\n`);
      return { status: 200, value: { ...testSchool } };
    });

    // call
    let res = await SchoolsService.delete(testSchool.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testSchool },
    });
  }).timeout(10000);

  /**
   * put with success
   */
  it('should put with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const putReq = {
      ...testSchool,
      id: undefined,
    };

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'put').callsFake(() => {
      console.log(`\nBaseServiceUtils.put called\n`);
      return {
        status: 200,
        value: { ...testSchool },
      };
    });

    // call
    let res = await SchoolsService.put(putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testSchool },
    });
  }).timeout(10000);

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const patchReq = {
      set: {
        ...testSchool,
        id: undefined,
        type: undefined,
      },
    };

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'patch').callsFake(() => {
      console.log(`\nBaseServiceUtils.patch called\n`);
      return {
        status: 200,
        value: { ...testSchool },
      };
    });

    // call
    let res = await SchoolsService.patch(patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testSchool },
    });
  }).timeout(10000);
});
