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
   * patch one with success
   */
  it('should patch one with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const patchReq = {
      set: {
        ...testSchool,
        id: undefined,
      },
    };

    // stub
    let stubServicePatchOne = sinon.stub(SchoolsService, 'patch').callsFake(() => {
      console.log(`\nSchoolService.patch called\n`);
      return { value: testSchool };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubServicePatchOne.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      id: testSchool.id,
    });
  }).timeout(10000);

  /**
   * patch failed due to invalid patch ops
   */
  it('should patch failed due to invalid patch ops', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const patchReq = {
      add: {},
    };

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.error.message).to.include('"add" is not allowed');
  }).timeout(10000);

  /**
   * patch only name with success
   */
  it('should patch only name with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const patchReq = {
      set: {
        name: testSchool.name,
      },
    };

    // stub
    let stubServicePatchOne = sinon.stub(SchoolsService, 'patch').callsFake(() => {
      console.log(`\nSchoolService.patch called\n`);
      return { value: testSchool };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubServicePatchOne.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      id: testSchool.id,
    });
  }).timeout(10000);

  /**
   * patch failed due to invalid name
   */
  it('should patch failed due to invalid name', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const patchReq = {
      set: {
        name: 1,
      },
    };

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.error.message).to.include('"set.name" must be a string');
  }).timeout(10000);

  /**
   * patch failed due to invalid status
   */
  it('should patch failed due to invalid status', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const patchReq = {
      set: {
        name: 'School',
        status: 'invalid',
      },
    };

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.error.message).to.include('"set.status" must be one of [pending, active, disabled]');
  }).timeout(10000);

  /**
   * patch failed due to invalid description
   */
  it('should patch failed due to invalid description', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const patchReq = {
      set: {
        name: 'School',
        description: 1,
      },
    };

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.error.message).to.include('"set.description" must be a string');
  }).timeout(10000);

  /**
   * patch one failed with exception
   */
  it('should patch one failed with exception', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const patchReq = {
      set: {
        ...testSchool,
        id: undefined,
      },
    };

    // stub
    sinon.stub(SchoolsService, 'patch').throws('Test exception');

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test exception');
  }).timeout(10000);
});
