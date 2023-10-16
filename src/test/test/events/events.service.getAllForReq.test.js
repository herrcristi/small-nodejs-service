const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const EventsService = require('../../../services/events/events.service.js');

describe('Events Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Events' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllForReq with success for global
   */
  it('should getAllForReq with success for global', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    let stubBuild = sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: {}, projection: { _id: 0 }, limit: 0, skip: 0 },
    });

    let stubBaseGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAll called\n`);
      return {
        status: 200,
        value: [...testEvents],
      };
    });

    let stubBaseGetAllCount = sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAllCount called\n`);
      return {
        status: 200,
        value: testEvents.length,
      };
    });

    // call
    let res = await EventsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBuild.callCount).to.equal(1);
    chai.expect(stubBaseGetAll.callCount).to.equal(1);
    chai.expect(stubBaseGetAllCount.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        data: [...testEvents],
        meta: {
          count: testEvents.length,
          limit: 0,
          skip: 0,
          sort: undefined,
        },
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq with success for tenant
   */
  it('should getAllForReq with success for tenant', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    let stubBuild = sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: {}, projection: { _id: 0 }, limit: 0, skip: 0 },
    });

    let stubBaseGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter, ctx) => {
      console.log(`\nDbOpsUtils.getAll called\n`);
      chai.expect(ctx.tenantID).to.equal('Tenant');
      return {
        status: 200,
        value: [...testEvents],
      };
    });

    let stubBaseGetAllCount = sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAllCount called\n`);
      return {
        status: 200,
        value: testEvents.length,
      };
    });

    // call
    let res = await EventsService.getAllForReq({ query: {} }, { _ctx, tenantID: 'Tenant' });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBuild.callCount).to.equal(1);
    chai.expect(stubBaseGetAll.callCount).to.equal(1);
    chai.expect(stubBaseGetAllCount.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        data: [...testEvents],
        meta: {
          count: testEvents.length,
          limit: 0,
          skip: 0,
          sort: undefined,
        },
      },
    });
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
    let res = await EventsService.getAllForReq({ query: {} }, _ctx);
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
    let res = await EventsService.getAllForReq({ query: {} }, _ctx);
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
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    let stubBuild = sinon.stub(RestApiUtils, 'buildFilterFromReq').returns({
      status: 200,
      value: { filter: {}, projection: { _id: 0 }, limit: 0, skip: 0 },
    });

    let stubBaseGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAll called\n`);
      return { status: 200, value: [...testEvents] };
    });

    let stubBaseGetAllCount = sinon.stub(DbOpsUtils, 'getAllCount').callsFake((config, filter) => {
      console.log(`\nDbOpsUtils.getAllCount called\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await EventsService.getAllForReq({ query: {} }, _ctx);
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
