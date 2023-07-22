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
        type: undefined,
      },
    };

    // stub
    let stubServicePatchOne = sinon.stub(SchoolsService, 'patch').callsFake(() => {
      console.log(`\nSchoolService.patch called\n`);
      return {
        status: 200,
        value: testSchool,
      };
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
      ...testSchool,
    });
  }).timeout(10000);

  /**
   * patch one fail
   */
  it('should patch one fail', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const patchReq = {
      set: {
        ...testSchool,
        id: undefined,
        type: undefined,
      },
    };

    // stub
    let stubServicePatchOne = sinon.stub(SchoolsService, 'patch').callsFake(() => {
      console.log(`\nSchoolService.patch called\n`);
      return {
        status: 400,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .send(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubServicePatchOne.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      message: 'Request is not valid',
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
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
        type: undefined,
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
