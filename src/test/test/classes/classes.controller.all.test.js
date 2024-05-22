const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const ClassesConstants = require('../../../services/classes/classes.constants.js');
const ClassesService = require('../../../services/classes/classes.service.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');

describe('Classes Controller', function () {
  const _ctx = { tenantID: 'school-univ1', reqID: 'testReq', lang: 'en', service: 'Service' };

  before(async function () {});

  beforeEach(async function () {
    sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { success: true, value: { userID: 'user.id', username: 'user.email' } };
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
    const testClasses = _.cloneDeep(TestConstants.Classes);

    // stub
    let stubService = sinon.stub(ClassesService, 'getAllForReq').callsFake(() => {
      console.log(`\nClassesService.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: testClasses,
          meta: { count: testClasses.length, skip: 0, limit: 0 },
        },
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      data: [...testClasses],
      meta: {
        count: testClasses.length,
        limit: 0,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * getAll validation fail
   */
  it('should getAll validation fail', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);

    // stub
    sinon.restore();
    let stubValidate = sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { status: 401, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    let stubService = sinon.stub(ClassesService, 'getAllForReq').callsFake(() => {
      console.log(`\nClassesService.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}`)
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
    const testClasses = _.cloneDeep(TestConstants.Classes);

    // stub
    let stubService = sinon.stub(ClassesService, 'getAllForReq').callsFake(() => {
      console.log(`\nClassesService.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}`)
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
    const testClasses = _.cloneDeep(TestConstants.Classes);

    // stub
    let stubService = sinon.stub(ClassesService, 'getAllForReq').callsFake(() => {
      console.log(`\nClassesService.getAllForReq called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}`)
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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'getOne').callsFake((objID, projection) => {
      console.log(`\nClassesService.getOne called ${JSON.stringify({ objID, projection }, null, 2)}\n`);
      chai.expect(objID).to.equal(testClass.id);
      chai.expect(projection).to.deep.equal({ _id: 0 });
      return {
        status: 200,
        value: testClass,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testClass,
    });
  }).timeout(10000);

  /**
   * getOne with success and projection
   */
  it('should getOne with success and projection', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'getOne').callsFake((objID, projection) => {
      console.log(`\nClassesService.getOne called ${JSON.stringify({ objID, projection }, null, 2)}\n`);
      chai.expect(objID).to.equal(testClass.id);
      chai.expect(projection).to.deep.equal({ id: 1, name: 1, _id: 0 });
      return {
        status: 200,
        value: testClass,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClass.id}?projection=id,name`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testClass,
    });
  }).timeout(10000);

  /**
   * getOne fail buildFilterFromReq
   */
  it('should getOne fail buildFilterFromReq', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubBuildFilter = sinon.stub(RestApiUtils, 'buildFilterFromReq').callsFake(() => {
      console.log(`\nRestApiUtils.buildFilterFromReq\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClass.id}`)
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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'getOne').callsFake(() => {
      console.log(`\nClassesService.getOne called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClass.id}`)
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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'getOne').callsFake(() => {
      console.log(`\nClassesService.getOne called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClass.id}`)
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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'post').callsFake(() => {
      console.log(`\nClassesService.post called\n`);
      return {
        status: 201,
        value: { ...testClass },
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${ClassesConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testClass });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testClass,
    });
  }).timeout(10000);

  /**
   * post fail
   */
  it('should post fail', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'post').callsFake(() => {
      console.log(`\nClassesService.post called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${ClassesConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testClass });
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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'post').callsFake(() => {
      console.log(`\nClassesService.post called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${ClassesConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testClass });
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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'delete').callsFake(() => {
      console.log(`\nClassesService.delete called\n`);
      return {
        status: 200,
        value: testClass,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .delete(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testClass,
    });
  }).timeout(10000);

  /**
   * delete fail
   */
  it('should delete fail', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'delete').callsFake(() => {
      console.log(`\nClassesService.delete called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .delete(`${ClassesConstants.ApiPath}/${testClass.id}`)
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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'delete').callsFake(() => {
      console.log(`\nClassesService.delete called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .delete(`${ClassesConstants.ApiPath}/${testClass.id}`)
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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'put').callsFake(() => {
      console.log(`\nClassesService.put called\n`);
      return {
        status: 200,
        value: testClass,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testClass });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testClass,
    });
  }).timeout(10000);

  /**
   * put fail
   */
  it('should put fail', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'put').callsFake(() => {
      console.log(`\nClassesService.put called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testClass });
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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'put').callsFake(() => {
      console.log(`\nClassesService.put called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testClass });
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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'patch').callsFake(() => {
      console.log(`\nClassesService.patch called\n`);
      return {
        status: 200,
        value: testClass,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ set: { ...testClass } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testClass,
    });
  }).timeout(10000);

  /**
   * patch fail
   */
  it('should patch fail', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'patch').callsFake(() => {
      console.log(`\nClassesService.patch called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ set: { ...testClass } });
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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubService = sinon.stub(ClassesService, 'patch').callsFake(() => {
      console.log(`\nClassesService.patch called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .send({ set: { ...testClass } });
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
    let stubService = sinon.stub(ClassesService, 'notification').callsFake(() => {
      console.log(`\nClassesService.notification called\n`);
      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${ClassesConstants.ApiPathInternal}/notifications`)
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
    let stubService = sinon.stub(ClassesService, 'notification').callsFake(() => {
      console.log(`\nClassesService.notification called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${ClassesConstants.ApiPathInternal}/notifications`)
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
    let stubService = sinon.stub(ClassesService, 'notification').callsFake(() => {
      console.log(`\nClassesService.notification called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${ClassesConstants.ApiPathInternal}/notifications`)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);
});
