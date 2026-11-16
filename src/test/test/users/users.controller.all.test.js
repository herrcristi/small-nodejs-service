const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const TestConstants = require('../../test-constants.js');
const UsersConstants = require('../../../services/users/users.constants.js');
const UsersService = require('../../../services/users/users.service.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const RestCommunicationsUtils = require('../../../core/utils/rest-communications.utils.js');

describe('Users Controller', function () {
  before(async function () {});

  beforeEach(async function () {
    sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { status: 200, value: { userID: 'user.id', username: 'user.email' } };
    });
    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });
  });

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
    let stubService = sinon.stub(UsersService, 'getAllForReq').callsFake(() => {
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
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPathInternal}`)
      .set('Origin', TestConstants.WebServer);
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
   * getAll validation fail
   */
  it('should getAll validation fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    sinon.restore(); // restore validation
    let stubValidate = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 401, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    let stubService = sinon.stub(UsersService, 'getAllForReq').callsFake(() => {
      console.log(`\nUsersService.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPathInternal}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubValidate.callCount).to.equal(1);
    chai.expect(stubService.callCount).to.equal(0);
    chai.expect(res.body.error).to.include('Test error');
  }).timeout(10000);

  /**
   * getAll fail
   */
  it('should getAll fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubService = sinon.stub(UsersService, 'getAllForReq').callsFake(() => {
      console.log(`\nUsersService.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPathInternal}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getAll fail exception
   */
  it('should getAll fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubService = sinon.stub(UsersService, 'getAllForReq').callsFake(() => {
      console.log(`\nUsersService.getAllForReq called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPathInternal}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'getOneForReq').callsFake((objID, projection) => {
      console.log(`\nUsersService.getOneForReq called ${JSON.stringify({ objID, projection }, null, 2)}\n`);
      chai.expect(objID).to.equal(testUser.id);
      chai.expect(projection).to.deep.equal({ _id: 0 });
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * getOne with success and projection
   */
  it('should getOne with success and projection', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'getOneForReq').callsFake((objID, projection) => {
      console.log(`\nUsersService.getOneForReq called ${JSON.stringify({ objID, projection }, null, 2)}\n`);
      chai.expect(objID).to.equal(testUser.id);
      chai.expect(projection).to.deep.equal({ id: 1, name: 1, _id: 0 });
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/${testUser.id}?projection=id,name`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * getOne fail buildFilterFromReq
   */
  it('should getOne fail buildFilterFromReq', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubBuildFilter = sinon.stub(RestApiUtils, 'buildFilterFromReq').callsFake(() => {
      console.log(`\nRestApiUtils.buildFilterFromReq\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubBuildFilter.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getOne fail getOne
   */
  it('should getOne fail getOne', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'getOneForReq').callsFake(() => {
      console.log(`\nUsersService.getOneForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getOne fail exception
   */
  it('should getOne fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'getOneForReq').callsFake(() => {
      console.log(`\nUsersService.getOneForReq called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'post').callsFake(() => {
      console.log(`\nUsersService.post called\n`);
      return {
        status: 201,
        value: { ...testUser },
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPathInternal}`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser }); // only email and schools
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * post fail
   */
  it('should post fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'post').callsFake(() => {
      console.log(`\nUsersService.post called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPathInternal}`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * post fail exception
   */
  it('should post fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'post').callsFake(() => {
      console.log(`\nUsersService.post called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPathInternal}`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'delete').callsFake(() => {
      console.log(`\nUsersService.delete called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .delete(`${UsersConstants.ApiPathInternal}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * delete fail
   */
  it('should delete fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'delete').callsFake(() => {
      console.log(`\nUsersService.delete called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .delete(`${UsersConstants.ApiPathInternal}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * delete fail exception
   */
  it('should delete fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'delete').callsFake(() => {
      console.log(`\nUsersService.delete called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .delete(`${UsersConstants.ApiPathInternal}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put with success
   */
  it('should put with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'putForReq').callsFake(() => {
      console.log(`\nUsersService.putForReq called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersConstants.ApiPath}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer)
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
   * put fail
   */
  it('should put fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'putForReq').callsFake(() => {
      console.log(`\nUsersService.putForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersConstants.ApiPath}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put fail exception
   */
  it('should put fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'putForReq').callsFake(() => {
      console.log(`\nUsersService.putForReq called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersConstants.ApiPath}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put status by a portal admin with success, fail, exception
   */
  it('should put status for a request with success, fail and exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];
    const url = `${UsersConstants.ApiPath}/${testUser.id}/status`;

    // success
    let stubService = sinon.stub(UsersService, 'putStatusForReq').callsFake(() => ({ status: 200, value: testUser }));
    let res = await supertest(TestConstants.WebServer)
      .put(url)
      .set('Origin', TestConstants.WebServer)
      .send({ status: 'disabled' });
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({ ...testUser });
    chai.expect(stubService.firstCall.args[1]).to.deep.equal({ status: 'disabled' });

    // fail
    stubService.callsFake(() => ({ status: 403, error: { message: 'Test error message' } }));
    res = await supertest(TestConstants.WebServer)
      .put(url)
      .set('Origin', TestConstants.WebServer)
      .send({ status: 'disabled' });
    chai.expect(res.status).to.equal(403);
    chai.expect(res.body.error).to.include('Test error message');

    // exception
    stubService.callsFake(() => {
      throw new Error('Test error message');
    });
    res = await supertest(TestConstants.WebServer)
      .put(url)
      .set('Origin', TestConstants.WebServer)
      .send({ status: 'disabled' });
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test error message');
    chai.expect(stubService.callCount).to.equal(3);
  }).timeout(10000);

  /**
   * put status with success, fail, exception
   */
  it('should put status with success, fail and exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];
    const url = `${UsersConstants.ApiPathInternal}/${testUser.id}/status`;

    // success
    let stubService = sinon.stub(UsersService, 'putStatus').callsFake(() => ({ status: 200, value: testUser }));
    let res = await supertest(TestConstants.WebServer)
      .put(url)
      .set('Origin', TestConstants.WebServer)
      .send({ status: 'active' });
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({ ...testUser });

    // fail
    stubService.callsFake(() => ({ status: 400, error: { message: 'Test error message' } }));
    res = await supertest(TestConstants.WebServer)
      .put(url)
      .set('Origin', TestConstants.WebServer)
      .send({ status: 'active' });
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.error).to.include('Test error message');

    // exception
    stubService.callsFake(() => {
      throw new Error('Test error message');
    });
    res = await supertest(TestConstants.WebServer)
      .put(url)
      .set('Origin', TestConstants.WebServer)
      .send({ status: 'active' });
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test error message');
    chai.expect(stubService.callCount).to.equal(3);
  }).timeout(10000);

  /**
   * put email with success
   */
  it('should put email with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'putEmail').callsFake(() => {
      console.log(`\nUsersService.putEmail called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersConstants.ApiPathInternal}/${testUser.id}/email`)
      .set('Origin', TestConstants.WebServer)
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
   * put email fail
   */
  it('should put email fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'putEmail').callsFake(() => {
      console.log(`\nUsersService.putEmail called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersConstants.ApiPathInternal}/${testUser.id}/email`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put email fail exception
   */
  it('should put email fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'putEmail').callsFake(() => {
      console.log(`\nUsersService.putEmail called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersConstants.ApiPathInternal}/${testUser.id}/email`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'patchForReq').callsFake(() => {
      console.log(`\nUsersService.patchForReq called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersConstants.ApiPath}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * patch fail
   */
  it('should patch fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'patchForReq').callsFake(() => {
      console.log(`\nUsersService.patchForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersConstants.ApiPath}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch fail exception
   */
  it('should patch fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'patchForReq').callsFake(() => {
      console.log(`\nUsersService.patchForReq called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersConstants.ApiPath}/${testUser.id}`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch school with success
   */
  it('should patch school with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'patchSchool').callsFake(() => {
      console.log(`\nUsersService.patchSchool called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersConstants.ApiPathInternal}/${testUser.id}/school`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * patch school fail
   */
  it('should patch school fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'patchSchool').callsFake(() => {
      console.log(`\nUsersService.patchSchool called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersConstants.ApiPathInternal}/${testUser.id}/school`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch school fail exception
   */
  it('should patch school fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'patchSchool').callsFake(() => {
      console.log(`\nUsersService.patchSchool called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersConstants.ApiPathInternal}/${testUser.id}/school`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * notification with success
   */
  it('should do notification with success', async () => {
    const notifications = _.cloneDeep(TestConstants.UsersNotifications);
    const notif = notifications[0];

    // stub
    let stubService = sinon.stub(UsersService, 'notification').callsFake(() => {
      console.log(`\nUsersService.notification called\n`);
      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPathInternal}/notifications`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal(true);
  }).timeout(10000);

  /**
   * notification fail
   */
  it('should notification fail', async () => {
    const notifications = _.cloneDeep(TestConstants.UsersNotifications);
    const notif = notifications[0];

    // stub
    let stubService = sinon.stub(UsersService, 'notification').callsFake(() => {
      console.log(`\nUsersService.notification called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPathInternal}/notifications`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * notification fail exception
   */
  it('should notification fail exception', async () => {
    const notifications = _.cloneDeep(TestConstants.UsersNotifications);
    const notif = notifications[0];

    // stub
    let stubService = sinon.stub(UsersService, 'notification').callsFake(() => {
      console.log(`\nUsersService.notification called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPathInternal}/notifications`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getPortalAdmins with success
   */
  it('should getPortalAdmins with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const stubService = sinon.stub(UsersService, 'getPortalAdminsForReq').resolves({
      status: 200,
      value: { data: testUsers, meta: { count: testUsers.length, skip: 0, limit: 0 } },
    });

    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/portal-admins`)
      .set('Origin', TestConstants.WebServer);

    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      data: [...testUsers],
      meta: { count: testUsers.length, limit: 0, skip: 0 },
    });
  }).timeout(10000);

  /**
   * getPortalAdmins fail
   */
  it('should getPortalAdmins fail', async () => {
    const stubService = sinon.stub(UsersService, 'getPortalAdminsForReq').resolves({
      status: 403,
      error: { message: 'Test error message', error: new Error('Test error') },
    });

    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/portal-admins`)
      .set('Origin', TestConstants.WebServer);

    chai.expect(res.status).to.equal(403);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getPortalAdmins fail exception
   */
  it('should getPortalAdmins fail exception', async () => {
    const stubService = sinon.stub(UsersService, 'getPortalAdminsForReq').callsFake(() => {
      throw new Error('Test error message');
    });

    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/portal-admins`)
      .set('Origin', TestConstants.WebServer);

    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getSchoolAdmins with success
   */
  it('should getSchoolAdmins with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const stubService = sinon.stub(UsersService, 'getSchoolAdminsForReq').resolves({
      status: 200,
      value: { data: testUsers, meta: { count: testUsers.length, skip: 0, limit: 0 } },
    });

    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/school-admins/school-1`)
      .set('Origin', TestConstants.WebServer);

    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(stubService.firstCall.args[0]).to.equal('school-1');
    chai.expect(res.body.data).to.deep.equal([...testUsers]);
  }).timeout(10000);

  /**
   * getSchoolAdmins fail
   */
  it('should getSchoolAdmins fail', async () => {
    const stubService = sinon.stub(UsersService, 'getSchoolAdminsForReq').resolves({
      status: 403,
      error: { message: 'Test error message', error: new Error('Test error') },
    });

    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/school-admins/school-1`)
      .set('Origin', TestConstants.WebServer);

    chai.expect(res.status).to.equal(403);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getSchoolAdmins fail exception
   */
  it('should getSchoolAdmins fail exception', async () => {
    const stubService = sinon.stub(UsersService, 'getSchoolAdminsForReq').callsFake(() => {
      throw new Error('Test error message');
    });

    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/school-admins/school-1`)
      .set('Origin', TestConstants.WebServer);

    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);
});
