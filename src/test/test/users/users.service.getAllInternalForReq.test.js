const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersService = require('../../../services/users/users.service.js');

describe('Users Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllInternalForReq with success
   */
  it('should getAllInternalForReq with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubBuild = sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: {}, projection: { _id: 0 }, limit: 0, skip: 0 },
    });

    let stubBaseGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAll called\n`);
      return {
        status: 200,
        value: [...testUsers],
      };
    });

    let stubBaseGetAllCount = sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAllCount called\n`);
      return {
        status: 200,
        value: testUsers.length,
      };
    });

    // call
    let res = await UsersService.getAllInternalForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBuild.callCount).to.equal(1);
    chai.expect(stubBaseGetAll.callCount).to.equal(1);
    chai.expect(stubBaseGetAllCount.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        data: [...testUsers],
        meta: {
          count: testUsers.length,
          limit: 0,
          skip: 0,
          sort: undefined,
        },
      },
    });
  }).timeout(10000);

  /**
   * getPortalAdminsForReq returns only the portal admins and only the fields of the list
   */
  it('should getPortalAdminsForReq only for the portal school and only portal admins', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const portalCtx = { ..._ctx, tenantID: TestConstants.PortalSchoolID };

    sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: {}, projection: { _id: 0, schools: 1 }, limit: 0, skip: 0 },
    });
    const check = (config, filter) => {
      chai.expect(filter.filter).to.deep.equal({
        $and: [{}, { schools: { $elemMatch: { id: TestConstants.PortalSchoolID, roles: 'portal-admin' } } }],
      });
      chai.expect(filter.projection).to.deep.equal({ _id: 0, id: 1, name: 1, email: 1, status: 1, _lang_en: 1 });
    };
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      check(config, filter);
      return { status: 200, value: testUsers };
    });
    const stubCount = sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      check(config, filter);
      return { status: 200, value: testUsers.length };
    });

    const res = await UsersService.getPortalAdminsForReq({ query: {} }, portalCtx);

    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.data).to.deep.equal(testUsers);
    chai.expect(stubGetAll.calledOnce).to.equal(true);
    chai.expect(stubCount.calledOnce).to.equal(true);

    // another tenant is denied
    const denied = await UsersService.getPortalAdminsForReq({ query: {} }, { ..._ctx, tenantID: 'another-school' });
    chai.expect(denied.status).to.equal(403);
    chai.expect(stubGetAll.calledOnce).to.equal(true);
  }).timeout(10000);

  /**
   * getPortalAdminsForReq when the request has no other filter
   */
  it('should getPortalAdminsForReq without other filters', async () => {
    sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { projection: { _id: 0 }, limit: 0, skip: 0 },
    });
    const check = (config, filter) => {
      chai.expect(filter.filter).to.deep.equal({
        $and: [{}, { schools: { $elemMatch: { id: TestConstants.PortalSchoolID, roles: 'portal-admin' } } }],
      });
    };
    sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      check(config, filter);
      return { status: 200, value: [] };
    });
    sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      check(config, filter);
      return { status: 200, value: 0 };
    });

    const res = await UsersService.getPortalAdminsForReq(
      { query: {} },
      { ..._ctx, tenantID: TestConstants.PortalSchoolID }
    );

    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.data).to.deep.equal([]);
  }).timeout(10000);

  /**
   * getSchoolAdminsForReq returns only the admins of that school, only for the portal school tenant
   */
  it('should getSchoolAdminsForReq only for the portal school and only the admins of the school', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const portalCtx = { ..._ctx, tenantID: TestConstants.PortalSchoolID };

    sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: { name: 'x' }, projection: { _id: 0, schools: 1 }, limit: 0, skip: 0 },
    });
    const check = (config, filter) => {
      chai.expect(filter.filter).to.deep.equal({
        $and: [{ name: 'x' }, { schools: { $elemMatch: { id: 'school-1', roles: 'admin' } } }],
      });
      chai.expect(filter.projection).to.deep.equal({ _id: 0, id: 1, name: 1, email: 1, status: 1, _lang_en: 1 });
    };
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      check(config, filter);
      return { status: 200, value: testUsers };
    });
    sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      check(config, filter);
      return { status: 200, value: testUsers.length };
    });

    const res = await UsersService.getSchoolAdminsForReq('school-1', { query: {} }, portalCtx);

    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.data).to.deep.equal(testUsers);

    // another tenant (like the admin of another school) is denied
    const denied = await UsersService.getSchoolAdminsForReq(
      'school-1',
      { query: {} },
      { ..._ctx, tenantID: 'school-2' }
    );
    chai.expect(denied.status).to.equal(403);
    chai.expect(stubGetAll.calledOnce).to.equal(true);
  }).timeout(10000);

  /**
   * getAllInternalForReq failed buildFilterFromReq
   */
  it('should getAllInternalForReq failed buildFilterFromReq', async () => {
    // stub
    let stubBuild = sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 400,
      error: { message: 'Test error message', error: new Error('Test error').toString() },
    });

    // call
    let res = await UsersService.getAllInternalForReq({ query: {} }, _ctx);
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
   * getAllInternalForReq failed getAll
   */
  it('should getAllInternalForReq failed getAll', async () => {
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
    let res = await UsersService.getAllInternalForReq({ query: {} }, _ctx);
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
   * getAllInternalForReq failed getAllCount
   */
  it('should getAllInternalForReq failed getAllCount', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubBuild = sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: {}, projection: { _id: 0 }, limit: 0, skip: 0 },
    });

    let stubBaseGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAll called\n`);
      return { status: 200, value: [...testUsers] };
    });

    let stubBaseGetAllCount = sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAllCount called\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await UsersService.getAllInternalForReq({ query: {} }, _ctx);
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
