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
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
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
    chai.expect(stubBase.callCount).to.equal(1);
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
   * getAllForReq failed
   */
  it('should getAllForReq failed', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await UsersService.getAllForReq({ query: {} }, _ctx);
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
   * getAllForReq fail for schools
   */
  it('should getAllForReq fail for schools', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: _.cloneDeep(testUsers),
          meta: { count: testUsers.length },
        },
      };
    });

    let stubPopulate = sinon.stub(BaseServiceUtils, 'populate').callsFake(() => {
      console.log(`\nBaseServiceUtils.populate called\n`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await UsersService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubPopulate.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 500,
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
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAll').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAll called\n`);
      return {
        status: 200,
        value: _.cloneDeep(testUsers),
      };
    });

    let stubSchoolRestGetAll = sinon.stub(SchoolsRest, 'getAllByIDs').callsFake((schoolIDs, projection) => {
      console.log(`\nSchoolsRest.getAllByIDs called\n`);
      chai.expect(schoolIDs).to.deep.equal(testSchools.map((item) => item.id));

      return { status: 200, value: [...testSchools] };
    });

    // call
    let res = await UsersService.getAll({ filter: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubSchoolRestGetAll.callCount).to.equal(1);

    chai.expect(res.status).to.equal(200);
    for (const user of res.value) {
      for (const school of user.schools) {
        chai.expect(school.name).to.be.a('string');
        chai.expect(school.status).to.be.a('string');
      }
    }
  }).timeout(10000);

  /**
   * getAllCount with success
   */
  it('should getAllCount with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllCount').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllCount called\n`);
      return { status: 200, value: 1 };
    });

    // call
    let res = await UsersService.getAllCount({}, _ctx);
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
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllByIDs').callsFake((config, ids, projection) => {
      console.log(`\nBaseServiceUtils.getAllByIDs called\n`);
      return {
        status: 200,
        value: _.cloneDeep(testUsers),
      };
    });

    let stubSchoolRestGetAll = sinon.stub(SchoolsRest, 'getAllByIDs').callsFake((schoolIDs, projection) => {
      console.log(`\nSchoolsRest.getAllByIDs called\n`);
      chai.expect(schoolIDs).to.deep.equal(testSchools.map((item) => item.id));

      return { status: 200, value: [...testSchools] };
    });

    // call
    let res = await UsersService.getAllByIDs(['id1'], { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubSchoolRestGetAll.callCount).to.equal(1);

    chai.expect(res.status).to.equal(200);
    for (const user of res.value) {
      for (const school of user.schools) {
        chai.expect(school.name).to.be.a('string');
        chai.expect(school.status).to.be.a('string');
      }
    }
  }).timeout(10000);

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getOne').callsFake(() => {
      console.log(`\nBaseServiceUtils.getOne called\n`);
      return { status: 200, value: { ...testUser } };
    });

    // call
    let res = await UsersService.getOne(testUser.id, { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testUser },
    });
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    const postReq = {
      ...testUser,
      id: undefined,
      type: undefined,
      name: undefined,
    };

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'post').callsFake((config, postObj) => {
      console.log(`\nBaseServiceUtils.post called\n`);
      return {
        status: 201,
        value: { ...postObj, id: testUser.id },
      };
    });

    // call
    let res = await UsersService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: { ...testUser },
    });
  }).timeout(10000);

  /**
   * post with success with defaults
   */
  it('should post one with success with defaults', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    const postReq = {
      ...testUser,
      id: undefined,
      status: undefined,
      type: undefined,
      name: undefined,
    };

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'post').callsFake((config, postObj) => {
      console.log(`\nBaseServiceUtils.post called\n`);
      return {
        status: 201,
        value: { ...postObj, id: testUser.id },
      };
    });

    // call
    let res = await UsersService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        ...testUser,
        status: UsersConstants.Status.Pending,
      },
    });
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'delete').callsFake(() => {
      console.log(`\nBaseServiceUtils.delete called\n`);
      return { status: 200, value: { ...testUser } };
    });

    // call
    let res = await UsersService.delete(testUser.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testUser },
    });
  }).timeout(10000);

  /**
   * put with success
   */
  it('should put with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    const putReq = {
      ...testUser,
      id: undefined,
    };

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'put').callsFake(() => {
      console.log(`\nBaseServiceUtils.put called\n`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    // call
    let res = await UsersService.put(putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testUser },
    });
  }).timeout(10000);

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    const patchReq = {
      set: {
        ...testUser,
        id: undefined,
        type: undefined,
      },
    };

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'patch').callsFake(() => {
      console.log(`\nBaseServiceUtils.patch called\n`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    // call
    let res = await UsersService.patch(patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testUser },
    });
  }).timeout(10000);
});
