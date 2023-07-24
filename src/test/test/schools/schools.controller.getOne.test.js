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
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubServiceGetOne = sinon.stub(SchoolsService, 'getOne').callsFake(() => {
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
    chai.expect(stubServiceGetOne.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({ ...testSchool });
  }).timeout(10000);

  /**
   * getOne fail
   */
  it('should getOne fail', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubServiceGetOne = sinon.stub(SchoolsService, 'getOne').callsFake((filter) => {
      console.log(`\nSchoolsService.getOne called\n`);
      return {
        status: 400,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}/${testSchool.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubServiceGetOne.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      message: 'Request is not valid',
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * getOne fail with exception
   */
  it('should getOne fail with exception', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubServiceGetOne = sinon.stub(SchoolsService, 'getOne').callsFake((filter) => {
      console.log(`\nSchoolsService.getOne called\n`);
      throw new Error('Test error');
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}/${testSchool.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubServiceGetOne.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
  }).timeout(10000);
});
