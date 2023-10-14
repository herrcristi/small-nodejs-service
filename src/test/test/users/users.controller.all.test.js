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
   * getAll fail
   */
  it('should getAll fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubService = sinon.stub(UsersService, 'getAllForReq').callsFake(() => {
      console.log(`\nUsersService.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}`);
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
    let res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}`);
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
    let stubService = sinon.stub(UsersService, 'getOne').callsFake(() => {
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
   * getOne fail
   */
  it('should getOne fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'getOne').callsFake(() => {
      console.log(`\nUsersService.getOne called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}/${testUser.id}`);
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
    let res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}/${testUser.id}`);
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
   * post fail
   */
  it('should post fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'post').callsFake(() => {
      console.log(`\nUsersService.post called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPath}`)
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
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPath}`)
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
   * delete fail
   */
  it('should delete fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'delete').callsFake(() => {
      console.log(`\nUsersService.delete called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${UsersConstants.ApiPath}/${testUser.id}`);
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
    let res = await chai.request(TestConstants.WebServer).delete(`${UsersConstants.ApiPath}/${testUser.id}`);
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
   * put fail
   */
  it('should put fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'put').callsFake(() => {
      console.log(`\nUsersService.put called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersConstants.ApiPath}/${testUser.id}`)
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
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersConstants.ApiPath}/${testUser.id}`)
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

  /**
   * patch fail
   */
  it('should patch fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersService, 'patch').callsFake(() => {
      console.log(`\nUsersService.patch called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersConstants.ApiPath}/${testUser.id}`)
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
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersConstants.ApiPath}/${testUser.id}`)
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
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPathInternal}/notifications`)
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
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPathInternal}/notifications`)
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
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPathInternal}/notifications`)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);
});
