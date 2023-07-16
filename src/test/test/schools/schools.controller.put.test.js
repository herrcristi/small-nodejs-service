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
   * put one with success
   */
  it('should put one with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const putReq = {
      ...testSchool,
      id: undefined,
    };

    // stub
    let stubServicePutOne = sinon.stub(SchoolsService, 'put').callsFake(() => {
      console.log(`\nSchoolService.put called\n`);
      return { value: testSchool };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubServicePutOne.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      id: testSchool.id,
    });
  }).timeout(10000);

  /**
   * put name and null description with success
   */
  it('should put name and null description with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const putReq = {
      name: testSchool.name,
      description: null,
    };

    // stub
    let stubServicePutOne = sinon.stub(SchoolsService, 'put').callsFake(() => {
      console.log(`\nSchoolService.put called\n`);
      return { value: testSchool };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubServicePutOne.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      id: testSchool.id,
    });
  }).timeout(10000);

  /**
   * put failed due to invalid name
   */
  it('should put failed due to invalid name', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const putReq = {
      name: 1,
    };

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.error.message).to.include('"name" must be a string');
  }).timeout(10000);

  /**
   * put failed due to invalid status
   */
  it('should put failed due to invalid status', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const putReq = {
      name: 'School',
      status: 'invalid',
    };

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.error.message).to.include('"status" must be one of [pending, active, disabled]');
  }).timeout(10000);

  /**
   * put failed due to invalid description
   */
  it('should put failed due to invalid description', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const putReq = {
      name: 'School',
      description: 1,
    };

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.error.message).to.include('"description" must be a string');
  }).timeout(10000);

  /**
   * put one failed with exception
   */
  it('should put one failed with exception', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const putReq = {
      ...testSchool,
      id: undefined,
    };

    // stub
    sinon.stub(SchoolsService, 'put').throws('Test exception');

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test exception');
  }).timeout(10000);
});
