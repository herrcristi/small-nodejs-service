const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const SchoolsConstants = require('../../../services/schools/schools.constants.js');
const SchoolsService = require('../../../services/schools/schools.service.js');

describe('Schools Controller', function () {
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
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubService = sinon.stub(SchoolsService, 'getAllForReq').callsFake(() => {
      console.log(`\nSchoolsService.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: testSchools,
          meta: { count: testSchools.length, skip: 0, limit: 0 },
        },
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      data: [...testSchools],
      meta: {
        count: testSchools.length,
        limit: 0,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubService = sinon.stub(SchoolsService, 'getOne').callsFake(() => {
      console.log(`\nSchoolsService.getOne called\n`);
      return {
        status: 200,
        value: testSchool,
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}/${testSchool.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testSchool,
    });
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubService = sinon.stub(SchoolsService, 'post').callsFake(() => {
      console.log(`\nSchoolsService.post called\n`);
      return {
        status: 201,
        value: { ...testSchool },
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${SchoolsConstants.ApiPath}`)
      .send({ ...testSchool });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testSchool,
    });
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubService = sinon.stub(SchoolsService, 'delete').callsFake(() => {
      console.log(`\nSchoolsService.delete called\n`);
      return {
        status: 200,
        value: testSchool,
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${SchoolsConstants.ApiPath}/${testSchool.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testSchool,
    });
  }).timeout(10000);

  /**
   * put with success
   */
  it('should put with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubService = sinon.stub(SchoolsService, 'put').callsFake(() => {
      console.log(`\nSchoolsService.put called\n`);
      return {
        status: 200,
        value: testSchool,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send({ ...testSchool });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testSchool,
    });
  }).timeout(10000);

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubService = sinon.stub(SchoolsService, 'patch').callsFake(() => {
      console.log(`\nSchoolsService.patch called\n`);
      return {
        status: 200,
        value: testSchool,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send({ set: { ...testSchool } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testSchool,
    });
  }).timeout(10000);

  /**
   * notification with success
   */
  it('should do notification with success', async () => {
    const notifications = _.cloneDeep(TestConstants.SchoolsNotifications);
    const notif = notifications[0];

    // stub
    let stubService = sinon.stub(SchoolsService, 'notification').callsFake(() => {
      console.log(`\nSchoolsService.notification called\n`);
      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${SchoolsConstants.ApiPathInternal}/notifications`)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal(true);
  }).timeout(10000);
});
