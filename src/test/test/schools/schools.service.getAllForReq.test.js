const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
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
    let stubBuild = sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: {}, projection: { _id: 0 }, limit: 0, skip: 0 },
    });

    let stubBaseGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAll called\n`);
      return {
        status: 200,
        value: [...testSchools],
      };
    });

    let stubBaseGetAllCount = sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAllCount called\n`);
      return {
        status: 200,
        value: testSchools.length,
      };
    });

    // call
    let res = await SchoolsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBuild.callCount).to.equal(1);
    chai.expect(stubBaseGetAll.callCount).to.equal(1);
    chai.expect(stubBaseGetAllCount.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        data: [...testSchools],
        meta: {
          count: testSchools.length,
          limit: 0,
          skip: 0,
          sort: undefined,
        },
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq should exclude the portal school from the managed list
   */
  it('should exclude the portal school from the managed list', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const expectedFilter = { $and: [{}, { id: { $ne: TestConstants.PortalSchoolID } }] };

    sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: {}, projection: { _id: 0 }, limit: 0, skip: 0 },
    });
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      chai.expect(filter.filter).to.deep.equal(expectedFilter);
      return { status: 200, value: testSchools };
    });
    const stubCount = sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      chai.expect(filter.filter).to.deep.equal(expectedFilter);
      return { status: 200, value: testSchools.length };
    });

    const result = await SchoolsService.getAllForReq({ query: {} }, _ctx);

    chai.expect(stubGetAll.calledOnce).to.equal(true);
    chai.expect(stubCount.calledOnce).to.equal(true);
    chai.expect(result.value.data).to.deep.equal(testSchools);
  }).timeout(10000);

  /**
   * getAllForReq failed buildFilterFromReq
   */
  it('should getAllForReq failed buildFilterFromReq', async () => {
    // stub
    let stubBuild = sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 400,
      error: { message: 'Test error message', error: new Error('Test error').toString() },
    });

    // call
    let res = await SchoolsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBuild.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq failed getAll
   */
  it('should getAllForReq failed getAll', async () => {
    // stub
    let stubBuild = sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: {}, projection: { _id: 0 }, limit: 0, skip: 0 },
    });

    let stubBaseGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAll called\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchoolsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBuild.callCount).to.equal(1);
    chai.expect(stubBaseGetAll.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq failed getAllCount
   */
  it('should getAllForReq failed getAllCount', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubBuild = sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: {}, projection: { _id: 0 }, limit: 0, skip: 0 },
    });

    let stubBaseGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAll called\n`);
      return { status: 200, value: [...testSchools] };
    });

    let stubBaseGetAllCount = sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAllCount called\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await SchoolsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBuild.callCount).to.equal(1);
    chai.expect(stubBaseGetAll.callCount).to.equal(1);
    chai.expect(stubBaseGetAllCount.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);
});
