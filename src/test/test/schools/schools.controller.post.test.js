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
   * post one with success
   */
  it('should post one with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // post request does not have id, name or name in schools
    const postReq = {
      ...testSchool,
      id: undefined,
    };

    // stub
    let stubServicePostOne = sinon.stub(SchoolsService, 'post').callsFake(() => {
      console.log(`\nSchoolService.post called\n`);
      return { value: testSchool };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).post(`${SchoolsConstants.ApiPath}`).send(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubServicePostOne.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      id: testSchool.id,
    });
  }).timeout(10000);

  /**
   * post one failed with exception
   */
  it('should post one failed with exception', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // post request does not have id, name or name in schools
    const postReq = {
      ...testSchool,
      id: undefined,
    };

    // stub
    sinon.stub(SchoolsService, 'post').throws('Test exception');

    // call
    let res = await chai.request(TestConstants.WebServer).post(`${SchoolsConstants.ApiPath}`).send(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test exception');
  }).timeout(10000);

  /**
   * post one failed due to no name
   */
  it('should post one failed due to no name', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // post request does not have id, name or name in schools
    const postReq = {};

    // call
    let res = await chai.request(TestConstants.WebServer).post(`${SchoolsConstants.ApiPath}`).send(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.error.message).to.include('"name" is required');
  }).timeout(10000);

  /**
   * post one failed due to no name
   */
  it('should post one failed due to no name', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // post request does not have id, name or name in schools
    const postReq = {
      name: {},
    };

    // call
    let res = await chai.request(TestConstants.WebServer).post(`${SchoolsConstants.ApiPath}`).send(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.error.message).to.include('"name" must be a string');
  }).timeout(10000);

  /**
   * post one failed due to no valid status
   */
  it('should post one failed due to no valid status', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // post request does not have id, name or name in schools
    const postReq = {
      name: 'School',
      status: 1,
    };

    // call
    let res = await chai.request(TestConstants.WebServer).post(`${SchoolsConstants.ApiPath}`).send(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.body.error.message).to.include('"status" must be one of [pending, active, disabled]');
  }).timeout(10000);
});
