const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const RestCommunicationsUtils = require('../../../core/utils/rest-communications.utils.js');

describe('Users Auth Controller', function () {
  before(async function () {});

  beforeEach(async function () {
    sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { status: 200, value: { userID: 'user.id', username: 'user.email' } };
    });
  });

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * login with success
   */
  it('should login with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'login').callsFake(() => {
      console.log(`\nUsersAuthService.login called\n`);
      return {
        status: 201,
        value: { ...testUser },
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/login`)
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
   * login fail
   */
  it('should login fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'login').callsFake(() => {
      console.log(`\nUsersAuthService.login called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/login`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * login fail exception
   */
  it('should login fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'login').callsFake(() => {
      console.log(`\nUsersAuthService.login called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/login`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * logout with success
   */
  it('should logout with success', async () => {
    // stub
    let stubService = sinon.stub(UsersAuthService, 'logout').callsFake(() => {
      console.log(`\nUsersAuthService.logout called\n`);
      return {
        status: 200,
        value: {},
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).post(`${UsersAuthConstants.ApiPath}/logout`).send({});
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({});
  }).timeout(10000);

  /**
   * logout fail
   */
  it('should logout fail', async () => {
    // stub
    let stubService = sinon.stub(UsersAuthService, 'logout').callsFake(() => {
      console.log(`\nUsersAuthService.logout called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).post(`${UsersAuthConstants.ApiPath}/logout`).send({});
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * logout fail exception
   */
  it('should logout fail exception', async () => {
    // stub
    let stubService = sinon.stub(UsersAuthService, 'logout').callsFake(() => {
      console.log(`\nUsersAuthService.logout called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai.request(TestConstants.WebServer).post(`${UsersAuthConstants.ApiPath}/logout`).send({});
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * s2s + token validate with success
   */
  it('should s2s+token validate with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    let stubService = sinon.stub(UsersAuthService, 'validate').callsFake(() => {
      console.log(`\nUsersAuthService.validate called\n`);
      return {
        status: 201,
        value: { ...testUser },
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPathInternal}/validate`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubRest.callCount).to.equal(1);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * s2s middleware validate fail
   */
  it('should s2s middleware validate fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 401, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPathInternal}/validate`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubRest.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('Request is not authorized');
    chai.expect(res.body.error).to.include('Test error');
  }).timeout(10000);

  /**
   * s2s middleware validate fail exception
   */
  it('should s2s middleware validate fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPathInternal}/validate`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubRest.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * token middleware validate fail
   */
  it('should token middleware validate fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    sinon.restore(); // restore validation

    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    let stubService = sinon.stub(UsersAuthRest, 'validate').callsFake(() => {
      console.log(`\UsersAuthRest.validate called\n`);
      return { status: 401, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/logout`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubRest.callCount).to.equal(0);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('Request is not authorized');
    chai.expect(res.body.error).to.include('Test error');
  }).timeout(10000);

  /**
   * token middleware validate fail exception
   */
  it('should token middleware validate fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    sinon.restore(); // restore validation

    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    let stubService = sinon.stub(UsersAuthRest, 'validate').callsFake(() => {
      console.log(`\nUsersAuthRest.validate called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/logout`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubRest.callCount).to.equal(0);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * token service validate fail
   */
  it('should token service validate fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    let stubService = sinon.stub(UsersAuthService, 'validate').callsFake(() => {
      console.log(`\nUsersAuthService.validate called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPathInternal}/validate`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubRest.callCount).to.equal(1);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * token service validate fail exception
   */
  it('should token service validate fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    sinon.restore(); // restore validation

    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    let stubService = sinon.stub(UsersAuthService, 'validate').callsFake(() => {
      console.log(`\nUsersAuthService.validate called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPathInternal}/validate`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubRest.callCount).to.equal(1);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'post').callsFake(() => {
      console.log(`\nUsersAuthService.post called\n`);
      return {
        status: 201,
        value: { ...testUser },
      };
    });

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPathInternal}`)
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
   * post fail
   */
  it('should post fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'post').callsFake(() => {
      console.log(`\nUsersAuthService.post called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPathInternal}`)
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
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'post').callsFake(() => {
      console.log(`\nUsersAuthService.post called\n`);
      throw new Error('Test error message');
    });

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPathInternal}`)
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
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'delete').callsFake(() => {
      console.log(`\nUsersAuthService.delete called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${UsersAuthConstants.ApiPath}/${testUser.id}`);
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
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'delete').callsFake(() => {
      console.log(`\nUsersAuthService.delete called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${UsersAuthConstants.ApiPath}/${testUser.id}`);
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
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'delete').callsFake(() => {
      console.log(`\nUsersAuthService.delete called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${UsersAuthConstants.ApiPath}/${testUser.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put password with success
   */
  it('should put password with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putPassword').callsFake(() => {
      console.log(`\nUsersAuthService.putPassword called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/${testUser.id}/password`)
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
   * put password fail
   */
  it('should put password fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putPassword').callsFake(() => {
      console.log(`\nUsersAuthService.putPassword called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/${testUser.id}/password`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put password fail exception
   */
  it('should put password fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putPassword').callsFake(() => {
      console.log(`\nUsersAuthService.putPassword called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/${testUser.id}/password`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * reset password with success
   */
  it('should reset password with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'resetPassword').callsFake(() => {
      console.log(`\nUsersAuthService.resetPassword called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/reset-password`)
      .send({ id: testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * reset password fail
   */
  it('should reset password fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'resetPassword').callsFake(() => {
      console.log(`\nUsersAuthService.resetPassword called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/reset-password`)
      .send({ id: testUser.id });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * reset password fail exception
   */
  it('should reset password fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'resetPassword').callsFake(() => {
      console.log(`\nUsersAuthService.resetPassword called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/reset-password`)
      .send({ id: testUser.id });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * validate reset token  with success
   */
  it('should validate reset token with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'validateResetToken').callsFake(() => {
      console.log(`\nUsersAuthService.validateResetToken called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/reset-token/validate?token=token`)
      .send({ id: testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * validate reset token fail
   */
  it('should validate reset token fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'validateResetToken').callsFake(() => {
      console.log(`\nUsersAuthService.validateResetToken called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/reset-token/validate?token=token`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * validate reset token fail exception
   */
  it('should validate reset token fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'validateResetToken').callsFake(() => {
      console.log(`\nUsersAuthService.validateResetToken called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/reset-token/validate?token=token`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put reset password with success
   */
  it('should put reset password with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putResetPassword').callsFake(() => {
      console.log(`\nUsersAuthService.putResetPassword called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/reset-token/password`)
      .set('x-reset-token', 'token')
      .send({ password: 'password' });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * put reset password fail
   */
  it('should put reset password fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putResetPassword').callsFake(() => {
      console.log(`\nUsersAuthService.putResetPassword called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/reset-token/password`)
      .set('x-reset-token', 'token')
      .send({ password: 'password' });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put reset password fail exception
   */
  it('should put reset password fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putResetPassword').callsFake(() => {
      console.log(`\nUsersAuthService.putResetPassword called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/reset-token/password`)
      .set('x-reset-token', 'token')
      .send({ password: 'password' });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put id (email) with success
   */
  it('should put id (email) with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putID').callsFake(() => {
      console.log(`\nUsersAuthService.putID called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/${testUser.id}/id`)
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
   * put id (email)  fail
   */
  it('should put id (email) fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putID').callsFake(() => {
      console.log(`\nUsersAuthService.putID called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/${testUser.id}/id`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put id (email) fail exception
   */
  it('should put id (email) fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putID').callsFake(() => {
      console.log(`\nUsersAuthService.putID called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/${testUser.id}/id`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch password with success
   */
  it('should patch password with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchPassword').callsFake(() => {
      console.log(`\nUsersAuthService.patchPassword called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/${testUser.id}/password`)
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
   * patch password fail
   */
  it('should patch password fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchPassword').callsFake(() => {
      console.log(`\nUsersAuthService.patchPassword called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/${testUser.id}/password`)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch password fail exception
   */
  it('should patch password fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchPassword').callsFake(() => {
      console.log(`\nUsersAuthService.patchPassword called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/${testUser.id}/password`)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch id (email) with success
   */
  it('should patch id (email) with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchID').callsFake(() => {
      console.log(`\nUsersAuthService.patchID called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/${testUser.id}/id`)
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
   * patch id (email) fail
   */
  it('should patch id (email) fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchID').callsFake(() => {
      console.log(`\nUsersAuthService.patchID called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/${testUser.id}/id`)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch id (email) fail exception
   */
  it('should patch id (email) fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchID').callsFake(() => {
      console.log(`\nUsersAuthService.patchID called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/${testUser.id}/id`)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch user school with success
   */
  it('should patch user school with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchUserSchool').callsFake(() => {
      console.log(`\nUsersAuthService.patchUserSchool called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/${testUser.id}/school/user/userID`)
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
   * patch user school fail
   */
  it('should patch user school fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchUserSchool').callsFake(() => {
      console.log(`\nUsersAuthService.patchUserSchool called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/${testUser.id}/school/user/userID`)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch user school fail exception
   */
  it('should patch user school fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchUserSchool').callsFake(() => {
      console.log(`\nUsersAuthService.patchUserSchool called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/${testUser.id}/school/user/userID`)
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
    let stubService = sinon.stub(UsersAuthService, 'notification').callsFake(() => {
      console.log(`\nUsersAuthService.notification called\n`);
      return {
        status: 200,
        value: true,
      };
    });

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPathInternal}/notifications`)
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
    let stubService = sinon.stub(UsersAuthService, 'notification').callsFake(() => {
      console.log(`\nUsersAuthService.notification called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPathInternal}/notifications`)
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
    let stubService = sinon.stub(UsersAuthService, 'notification').callsFake(() => {
      console.log(`\nUsersAuthService.notification called\n`);
      throw new Error('Test error message');
    });

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPathInternal}/notifications`)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);
});
