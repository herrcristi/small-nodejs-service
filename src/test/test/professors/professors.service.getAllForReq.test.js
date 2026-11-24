const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const ProfessorsService = require('../../../services/professors/professors.service.js');
const RolesPermissions = require('../../../services/roles.permissions.js');

describe('Professors Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Professors' };

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
    const testProfessors = _.cloneDeep(TestConstants.Professors);

    // stub
    let stubBuild = sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: {}, projection: { _id: 0 }, limit: 0, skip: 0 },
    });

    let stubBaseGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAll called\n`);
      return {
        status: 200,
        value: [...testProfessors],
      };
    });

    let stubBaseGetAllCount = sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAllCount called\n`);
      return {
        status: 200,
        value: testProfessors.length,
      };
    });

    // call
    let res = await ProfessorsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBuild.callCount).to.equal(1);
    chai.expect(stubBaseGetAll.callCount).to.equal(1);
    chai.expect(stubBaseGetAllCount.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        data: [...testProfessors],
        meta: {
          count: testProfessors.length,
          limit: 0,
          skip: 0,
          sort: undefined,
        },
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq failed no tenant
   */
  it('should getAllForReq failed tenant', async () => {
    // call
    let res = await ProfessorsService.getAllForReq({ query: {} }, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
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
    let res = await ProfessorsService.getAllForReq({ query: {} }, _ctx);
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
    let res = await ProfessorsService.getAllForReq({ query: {} }, { ..._ctx });
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
    const testProfessors = _.cloneDeep(TestConstants.Professors);

    // stub
    let stubBuild = sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: {}, projection: { _id: 0 }, limit: 0, skip: 0 },
    });

    let stubBaseGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAll called\n`);
      return { status: 200, value: [...testProfessors] };
    });

    let stubBaseGetAllCount = sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAllCount called\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await ProfessorsService.getAllForReq({ query: {} }, _ctx);
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

  /**
   * the list of a professor is restricted to what concerns it (RolesPermissions: a professor sees only itself here), with
   * its count; a failure to read what it sees is returned
   */
  it('should getAllForReq only what the professor sees', async () => {
    // stub: the scope of the professor, the reads
    const part = { groupIDs: [], scheduleIDs: [] };
    const scope = { id: 'user1', professor: part, student: null, groupIDs: [], scheduleIDs: [] };
    const stubScope = sinon.stub(RolesPermissions, 'getScope').resolves({ status: 200, value: scope });
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').resolves({ status: 200, value: [{ id: 'user1' }] });
    const stubCount = sinon.stub(DbOpsUtils, 'getAllCount').resolves({ status: 200, value: 1 });
    sinon.stub(ReferencesUtils, 'populateReferences').resolves({ status: 200, value: true });

    // call
    const ctx = { ..._ctx, roles: ['professor'] };
    const res = await ProfessorsService.getAllForReq({ query: {} }, ctx);

    // check: the list and its count with the filter of the scope
    chai.expect(res.status).to.equal(200);
    chai.expect(stubScope.firstCall.args[0]).to.equal(ctx);
    chai.expect(stubGetAll.firstCall.args[1].filter.$and[1]).to.deep.equal({ id: 'user1' });
    chai.expect(stubCount.firstCall.args[1].filter.$and[1]).to.deep.equal({ id: 'user1' });

    // case: what it sees can not be read
    stubScope.resolves({ status: 500, error: { message: 'Database failure' } });
    const resFailed = await ProfessorsService.getAllForReq({ query: {} }, ctx);
    chai.expect(resFailed.status).to.equal(500);
  }).timeout(10000);
});
