const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils');

const TestConstants = require('../../test-constants.js');
const UsersConstants = require('../../../services/users/users.constants.js');
const UsersService = require('../../../services/users/users.service.js');
const SchoolsRest = require('../../../services/rest/schools.rest');

describe('Users Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

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
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubDbGetAll = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: _.cloneDeep(testUsers),
          meta: { count: testUsers.length },
        },
      };
    });

    let stubSchoolRestGetAll = sinon.stub(SchoolsRest, 'getAllByIDs').callsFake((schoolIDs, projection) => {
      console.log(`\nSchoolsRest.getAllByIDs called\n`);
      chai.expect(schoolIDs).to.deep.equal(testSchools.map((item) => item.id));

      return { status: 200, value: [...testSchools] };
    });

    // call
    let res = await UsersService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAll.callCount).to.equal(1);
    chai.expect(stubSchoolRestGetAll.callCount).to.equal(1);

    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.meta).to.deep.equal({
      count: testUsers.length,
    });
    for (const user of res.value.data) {
      for (const school of user.schools) {
        chai.expect(school.name).to.be.a('string');
        chai.expect(school.status).to.be.a('string');
      }
    }
  }).timeout(10000);

  /**
   * getAllForReq for no schools
   */
  it('should getAllForReq for no schools', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testSchools = _.cloneDeep(TestConstants.Schools);

    for (let user of testUsers) {
      delete user.schools;
    }

    // stub
    let stubDbGetAll = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: _.cloneDeep(testUsers),
          meta: { count: testUsers.length },
        },
      };
    });

    let stubSchoolRestGetAll = sinon.stub(SchoolsRest, 'getAllByIDs').callsFake((schoolIDs, projection) => {
      console.log(`\nSchoolsRest.getAllByIDs called\n`);
      chai.expect(schoolIDs).to.deep.equal(testSchools.map((item) => item.id));

      return { status: 200, value: [...testSchools] };
    });

    // call
    let res = await UsersService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAll.callCount).to.equal(1);
    chai.expect(stubSchoolRestGetAll.callCount).to.equal(0); // no call

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        data: _.cloneDeep(testUsers),
        meta: { count: testUsers.length },
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq failed
   */
  it('should getAllForReq failed', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubDbGetAll = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await UsersService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAll.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq fail for schools
   */
  it('should getAllForReq fail for schools', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubDbGetAll = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: _.cloneDeep(testUsers),
          meta: { count: testUsers.length },
        },
      };
    });

    let stubSchoolRestGetAll = sinon.stub(SchoolsRest, 'getAllByIDs').callsFake((schoolIDs, projection) => {
      console.log(`\nSchoolsRest.getAllByIDs called\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await UsersService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAll.callCount).to.equal(1);
    chai.expect(stubSchoolRestGetAll.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * getAllForReq success without schools
   */
  it('should getAllForReq success without schools', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubDbGetAll = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: _.cloneDeep(testUsers),
          meta: { count: testUsers.length },
        },
      };
    });

    let stubSchoolRestGetAll = sinon.stub(SchoolsRest, 'getAllByIDs').callsFake((schoolIDs, projection) => {
      console.log(`\nSchoolsRest.getAllByIDs called\n`);
      chai.expect(schoolIDs).to.deep.equal(testSchools.map((item) => item.id));

      return { status: 200, value: [] };
    });

    // call
    let res = await UsersService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAll.callCount).to.equal(1);
    chai.expect(stubSchoolRestGetAll.callCount).to.equal(1);

    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.meta).to.deep.equal({
      count: testUsers.length,
    });
    for (const user of res.value.data) {
      for (const school of user.schools) {
        chai.expect(school.name).to.not.exist;
        chai.expect(school.status).to.not.exist;
      }
    }
  }).timeout(10000);
});
