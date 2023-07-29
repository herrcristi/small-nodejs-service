const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const UsersConstants = require('../../../services/users/users.constants.js');
const UsersService = require('../../../services/users/users.service.js');

describe('Users Controller', function () {
  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAll with success
   */
  it('should getAll with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubService = sinon.stub(UsersService, 'getAllForReq').callsFake((filter) => {
      console.log(`\nUsersService.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: testUsers,
          meta: { count: testUsers.length, skip: 0, limit: 0 },
        },
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      data: [...testUsers],
      meta: {
        count: testUsers.length,
        limit: 0,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'getOne').callsFake((filter) => {
      console.log(`\nUsersService.getOne called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}/${testUser.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'post').callsFake((filter) => {
      console.log(`\nUsersService.post called\n`);
      return {
        status: 201,
        value: { ...testUser },
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPath}`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'delete').callsFake((filter) => {
      console.log(`\nUsersService.delete called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${UsersConstants.ApiPath}/${testUser.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * put with success
   */
  it('should put with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'put').callsFake((filter) => {
      console.log(`\nUsersService.put called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersConstants.ApiPath}/${testUser.id}`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'patch').callsFake((filter) => {
      console.log(`\nUsersService.patch called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersConstants.ApiPath}/${testUser.id}`)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);
});
