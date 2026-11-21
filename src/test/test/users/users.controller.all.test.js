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
   * getAll (portal admins) with success, fail, exception
   */
  it('should getAll with success, fail and exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const value = { data: testUsers, meta: { count: testUsers.length, skip: 0, limit: 0 } };

    // success
    let stubService = sinon.stub(UsersService, 'getAllForReq').callsFake(() => ({ status: 200, value }));
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}`)
      .set('Origin', TestConstants.WebServer);
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal(value);

    // fail
    stubService.callsFake(() => ({ status: 403, error: { message: 'Test error message' } }));
    res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}`)
      .set('Origin', TestConstants.WebServer);
    chai.expect(res.status).to.equal(403);
    chai.expect(res.body.error).to.include('Test error message');

    // exception
    stubService.callsFake(() => {
      throw new Error('Test error message');
    });
    res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}`)
      .set('Origin', TestConstants.WebServer);
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test error message');
    chai.expect(stubService.callCount).to.equal(3);
  }).timeout(10000);

  /**
   * getAll internal with success
   */
  it('should getAll internal with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubService = sinon.stub(UsersService, 'getAllInternalForReq').callsFake(() => {
      console.log(`\nUsersService.getAllInternalForReq called\n`);
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
   * getAll internal validation fail
   */
  it('should getAll internal validation fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    sinon.restore(); // restore validation
    let stubValidate = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 401, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    let stubService = sinon.stub(UsersService, 'getAllInternalForReq').callsFake(() => {
      console.log(`\nUsersService.getAllInternalForReq called\n`);
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
   * getAll internal fail
   */
  it('should getAll internal fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubService = sinon.stub(UsersService, 'getAllInternalForReq').callsFake(() => {
      console.log(`\nUsersService.getAllInternalForReq called\n`);
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
   * getAll internal fail exception
   */
  it('should getAll internal fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubService = sinon.stub(UsersService, 'getAllInternalForReq').callsFake(() => {
      console.log(`\nUsersService.getAllInternalForReq called\n`);
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
    let stubService = sinon.stub(UsersService, 'getOne').callsFake((objID, projection) => {
      console.log(`\nUsersService.getOne called ${JSON.stringify({ objID, projection }, null, 2)}\n`);
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
    let stubService = sinon.stub(UsersService, 'getOne').callsFake((objID, projection) => {
      console.log(`\nUsersService.getOne called ${JSON.stringify({ objID, projection }, null, 2)}\n`);
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
    let stubService = sinon.stub(UsersService, 'getOne').callsFake(() => {
      console.log(`\nUsersService.getOne called\n`);
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
    let stubService = sinon.stub(UsersService, 'getOne').callsFake(() => {
      console.log(`\nUsersService.getOne called\n`);
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
    let stubService = sinon.stub(UsersService, 'put').callsFake(() => {
      console.log(`\nUsersService.put called\n`);
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
    let stubService = sinon.stub(UsersService, 'put').callsFake(() => {
      console.log(`\nUsersService.put called\n`);
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
    let stubService = sinon.stub(UsersService, 'put').callsFake(() => {
      console.log(`\nUsersService.put called\n`);
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
   * a user that exists but can not be reached (403 from the service) is answered as not found
   */
  it('should answer not found for a user of another school', async () => {
    // stub: the service answers "not a member" for get, put and patch
    const notMember = { status: 403, error: { message: 'The user user1 is not a member of the current school' } };
    sinon.stub(UsersService, 'getOne').returns(notMember);
    sinon.stub(UsersService, 'put').returns(notMember);
    sinon.stub(UsersService, 'patch').returns(notMember);

    for (const [method, body] of [
      ['get', undefined],
      ['put', { name: 'Name' }],
      ['patch', { set: { name: 'Name' } }],
    ]) {
      // call
      const res = await supertest(TestConstants.WebServer)
        [method](`${UsersConstants.ApiPath}/user1`)
        .set('Origin', TestConstants.WebServer)
        .send(body);

      // check: not found, the reason is not shown
      chai.expect(res.status).to.equal(404);
      chai.expect(res.body.error).to.include('Not found user1').and.not.include('member');
    }
  }).timeout(10000);

  /**
   * put and patch status (portal admins) with success, fail, exception
   */
  for (const [method, fn, body] of [
    ['put', 'putStatus', { status: 'disabled' }],
    ['patch', 'patchStatus', { set: { status: 'disabled' } }],
  ]) {
    /**
     * the answer of the service is passed on: the value, the error, or 500 for an exception
     */
    it(`should ${method} status with success, fail and exception`, async () => {
      const testUsers = _.cloneDeep(TestConstants.Users);
      const testUser = testUsers[0];
      const url = `${UsersConstants.ApiPath}/${testUser.id}/status`;
      const call = () =>
        supertest(TestConstants.WebServer)[method](url).set('Origin', TestConstants.WebServer).send(body);

      // success
      let stubService = sinon.stub(UsersService, fn).callsFake(() => ({ status: 200, value: testUser }));
      let res = await call();
      chai.expect(res.status).to.equal(200);
      chai.expect(res.body).to.deep.equal({ ...testUser });
      chai.expect(stubService.firstCall.args.slice(0, 2)).to.deep.equal([testUser.id, body]);

      // fail
      stubService.callsFake(() => ({ status: 403, error: { message: 'Test error message' } }));
      res = await call();
      chai.expect(res.status).to.equal(403);
      chai.expect(res.body.error).to.include('Test error message');

      // exception
      stubService.callsFake(() => {
        throw new Error('Test error message');
      });
      res = await call();
      chai.expect(res.status).to.equal(500);
      chai.expect(res.body.error).to.include('Test error message');
      chai.expect(stubService.callCount).to.equal(3);
    }).timeout(10000);
  }

  /**
   * delete a school admin (portal admins) with success, fail, exception
   */
  it('should delete school admin with success, fail and exception', async () => {
    const url = `${UsersConstants.ApiPath}/school-admins/school1/user1`;
    const call = () => supertest(TestConstants.WebServer).delete(url).set('Origin', TestConstants.WebServer);

    // success
    let stubService = sinon
      .stub(UsersService, 'deleteSchoolAdmin')
      .callsFake(() => ({ status: 200, value: { id: 'user1' } }));
    let res = await call();
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({ id: 'user1' });
    chai.expect(stubService.firstCall.args.slice(0, 2)).to.deep.equal(['school1', 'user1']);

    // fail
    stubService.callsFake(() => ({ status: 400, error: { message: 'Test error message' } }));
    res = await call();
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.error).to.include('Test error message');

    // exception
    stubService.callsFake(() => {
      throw new Error('Test error message');
    });
    res = await call();
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * activate (internal) with success, fail, exception
   */
  it('should activate with success, fail and exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];
    const url = `${UsersConstants.ApiPathInternal}/${testUser.id}/activate`;
    const call = () => supertest(TestConstants.WebServer).post(url).set('Origin', TestConstants.WebServer).send({});

    // success
    let stubService = sinon.stub(UsersService, 'activate').callsFake(() => ({ status: 200, value: testUser }));
    let res = await call();
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({ ...testUser });
    chai.expect(stubService.firstCall.args[0]).to.equal(testUser.id);

    // fail
    stubService.callsFake(() => ({ status: 404, error: { message: 'Test error message' } }));
    res = await call();
    chai.expect(res.status).to.equal(404);
    chai.expect(res.body.error).to.include('Test error message');

    // exception
    stubService.callsFake(() => {
      throw new Error('Test error message');
    });
    res = await call();
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test error message');
    chai.expect(stubService.callCount).to.equal(3);
  }).timeout(10000);

  /**
   * recreate account and delete account (internal) with success, fail, exception
   */
  it('should recreate and delete an account with success, fail and exception', async () => {
    const testUser = _.cloneDeep(TestConstants.Users[0]);

    for (const [route, fn] of [
      ['recreate-account', 'recreateAccount'],
      ['delete-account', 'deleteAccount'],
    ]) {
      const url = `${UsersConstants.ApiPathInternal}/${testUser.id}/${route}`;
      const call = () => supertest(TestConstants.WebServer).post(url).set('Origin', TestConstants.WebServer).send({});

      // success
      const stubService = sinon.stub(UsersService, fn).resolves({ status: 200, value: testUser });
      let res = await call();
      chai.expect(res.status, route).to.equal(200);
      chai.expect(res.body, route).to.deep.equal({ ...testUser });
      chai.expect(stubService.firstCall.args[0], route).to.equal(testUser.id);

      // fail
      stubService.resolves({ status: 404, error: { message: 'Test error message' } });
      res = await call();
      chai.expect(res.status, route).to.equal(404);

      // exception
      stubService.throws(new Error('Test error message'));
      res = await call();
      chai.expect(res.status, route).to.equal(500);
      chai.expect(res.body.error, route).to.include('Test error message');
    }
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
    let stubService = sinon.stub(UsersService, 'patch').callsFake(() => {
      console.log(`\nUsersService.patch called\n`);
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
    let stubService = sinon.stub(UsersService, 'patch').callsFake(() => {
      console.log(`\nUsersService.patch called\n`);
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
    let stubService = sinon.stub(UsersService, 'patch').callsFake(() => {
      console.log(`\nUsersService.patch called\n`);
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
    // stub
    const stubService = sinon.stub(UsersService, 'getPortalAdminsForReq').resolves({
      status: 200,
      value: { data: testUsers, meta: { count: testUsers.length, skip: 0, limit: 0 } },
    });

    // call
    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/portal-admins`)
      .set('Origin', TestConstants.WebServer);

    // check
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
    // stub
    const stubService = sinon.stub(UsersService, 'getPortalAdminsForReq').resolves({
      status: 403,
      error: { message: 'Test error message', error: new Error('Test error') },
    });

    // call
    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/portal-admins`)
      .set('Origin', TestConstants.WebServer);

    // check
    chai.expect(res.status).to.equal(403);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getPortalAdmins fail exception
   */
  it('should getPortalAdmins fail exception', async () => {
    // stub
    const stubService = sinon.stub(UsersService, 'getPortalAdminsForReq').callsFake(() => {
      throw new Error('Test error message');
    });

    // call
    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/portal-admins`)
      .set('Origin', TestConstants.WebServer);

    // check
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
    // stub
    const stubService = sinon.stub(UsersService, 'getSchoolAdminsForReq').resolves({
      status: 200,
      value: { data: testUsers, meta: { count: testUsers.length, skip: 0, limit: 0 } },
    });

    // call
    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/school-admins/school-1`)
      .set('Origin', TestConstants.WebServer);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(stubService.firstCall.args[0]).to.equal('school-1');
    chai.expect(res.body.data).to.deep.equal([...testUsers]);
  }).timeout(10000);

  /**
   * getSchoolAdmins fail
   */
  it('should getSchoolAdmins fail', async () => {
    // stub
    const stubService = sinon.stub(UsersService, 'getSchoolAdminsForReq').resolves({
      status: 403,
      error: { message: 'Test error message', error: new Error('Test error') },
    });

    // call
    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/school-admins/school-1`)
      .set('Origin', TestConstants.WebServer);

    // check
    chai.expect(res.status).to.equal(403);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * getSchoolAdmins fail exception
   */
  it('should getSchoolAdmins fail exception', async () => {
    // stub
    const stubService = sinon.stub(UsersService, 'getSchoolAdminsForReq').callsFake(() => {
      throw new Error('Test error message');
    });

    // call
    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}/school-admins/school-1`)
      .set('Origin', TestConstants.WebServer);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);
});
