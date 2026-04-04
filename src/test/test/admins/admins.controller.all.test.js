const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const TestConstants = require('../../test-constants.js');
const AdminsConstants = require('../../../services/admins/admins.constants.js');
const AdminsService = require('../../../services/admins/admins.service.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const RestCommunicationsUtils = require('../../../core/utils/rest-communications.utils.js');

describe('Admins Controller', function () {
  const _ctx = { tenantID: 'school-univ1', reqID: 'testReq', lang: 'en', service: 'Service' };

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
    const testAdmins = _.cloneDeep(TestConstants.Admins);

    // stub
    let stubService = sinon.stub(AdminsService, 'getAllForReq').callsFake(() => {
      console.log(`\nAdminsService.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: testAdmins,
          meta: { count: testAdmins.length, skip: 0, limit: 0 },
        },
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${AdminsConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      data: [...testAdmins],
      meta: {
        count: testAdmins.length,
        limit: 0,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * getAll validation fail
   */
  it('should getAll validation fail', async () => {
    const testAdmins = _.cloneDeep(TestConstants.Admins);

    // stub
    sinon.restore(); // restore validation
    let stubValidate = sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { status: 401, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    let stubService = sinon.stub(AdminsService, 'getAllForReq').callsFake(() => {
      console.log(`\nAdminsService.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${AdminsConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID);
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);

    // stub
    let stubService = sinon.stub(AdminsService, 'getAllForReq').callsFake(() => {
      console.log(`\nAdminsService.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${AdminsConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID);
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);

    // stub
    let stubService = sinon.stub(AdminsService, 'getAllForReq').callsFake(() => {
      console.log(`\nAdminsService.getAllForReq called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${AdminsConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID);
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'getOne').callsFake((objID, projection) => {
      console.log(`\nAdminsService.getOne called ${JSON.stringify({ objID, projection }, null, 2)}\n`);
      chai.expect(objID).to.equal(testAdmin.id);
      chai.expect(projection).to.deep.equal({ _id: 0 });
      return {
        status: 200,
        value: testAdmin,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testAdmin,
    });
  }).timeout(10000);

  /**
   * getOne with success and projection
   */
  it('should getOne with success and projection', async () => {
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'getOne').callsFake((objID, projection) => {
      console.log(`\nAdminsService.getOne called ${JSON.stringify({ objID, projection }, null, 2)}\n`);
      chai.expect(objID).to.equal(testAdmin.id);
      chai.expect(projection).to.deep.equal({ id: 1, name: 1, _id: 0 });
      return {
        status: 200,
        value: testAdmin,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${AdminsConstants.ApiPath}/${testAdmin.id}?projection=id,name`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testAdmin,
    });
  }).timeout(10000);

  /**
   * getOne fail buildFilterFromReq
   */
  it('should getOne fail buildFilterFromReq', async () => {
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubBuildFilter = sinon.stub(RestApiUtils, 'buildFilterFromReq').callsFake(() => {
      console.log(`\nRestApiUtils.buildFilterFromReq\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID);
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'getOne').callsFake(() => {
      console.log(`\nAdminsService.getOne called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID);
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'getOne').callsFake(() => {
      console.log(`\nAdminsService.getOne called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID);
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'post').callsFake(() => {
      console.log(`\nAdminsService.post called\n`);
      return {
        status: 201,
        value: { ...testAdmin },
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${AdminsConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testAdmin });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testAdmin,
    });
  }).timeout(10000);

  /**
   * post fail
   */
  it('should post fail', async () => {
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'post').callsFake(() => {
      console.log(`\nAdminsService.post called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${AdminsConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testAdmin });
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'post').callsFake(() => {
      console.log(`\nAdminsService.post called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${AdminsConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testAdmin });
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'delete').callsFake(() => {
      console.log(`\nAdminsService.delete called\n`);
      return {
        status: 200,
        value: testAdmin,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .delete(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testAdmin,
    });
  }).timeout(10000);

  /**
   * delete fail
   */
  it('should delete fail', async () => {
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'delete').callsFake(() => {
      console.log(`\nAdminsService.delete called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .delete(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID);
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'delete').callsFake(() => {
      console.log(`\nAdminsService.delete called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .delete(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID);
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'put').callsFake(() => {
      console.log(`\nAdminsService.put called\n`);
      return {
        status: 200,
        value: testAdmin,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testAdmin });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testAdmin,
    });
  }).timeout(10000);

  /**
   * put fail
   */
  it('should put fail', async () => {
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'put').callsFake(() => {
      console.log(`\nAdminsService.put called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testAdmin });
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'put').callsFake(() => {
      console.log(`\nAdminsService.put called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testAdmin });
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'patch').callsFake(() => {
      console.log(`\nAdminsService.patch called\n`);
      return {
        status: 200,
        value: testAdmin,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ set: { ...testAdmin } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testAdmin,
    });
  }).timeout(10000);

  /**
   * patch fail
   */
  it('should patch fail', async () => {
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'patch').callsFake(() => {
      console.log(`\nAdminsService.patch called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ set: { ...testAdmin } });
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
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubService = sinon.stub(AdminsService, 'patch').callsFake(() => {
      console.log(`\nAdminsService.patch called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${AdminsConstants.ApiPath}/${testAdmin.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ set: { ...testAdmin } });
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
    let stubService = sinon.stub(AdminsService, 'notification').callsFake(() => {
      console.log(`\nAdminsService.notification called\n`);
      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${AdminsConstants.ApiPathInternal}/notifications`)
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
    let stubService = sinon.stub(AdminsService, 'notification').callsFake(() => {
      console.log(`\nAdminsService.notification called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${AdminsConstants.ApiPathInternal}/notifications`)
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
    let stubService = sinon.stub(AdminsService, 'notification').callsFake(() => {
      console.log(`\nAdminsService.notification called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${AdminsConstants.ApiPathInternal}/notifications`)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);
});
