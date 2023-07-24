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
   * get all with success
   */
  it('should get all with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubServiceGetAll = sinon.stub(SchoolsService, 'getAllForReq').callsFake((filter) => {
      console.log(`\nSchoolsService.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: testSchools,
          meta: {
            count: testSchools.length,
            skip: 0,
            limit: 0,
          },
        },
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubServiceGetAll.callCount).to.equal(1);
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
   * get all fail
   */
  it('should get all fail', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubServiceGetAll = sinon.stub(SchoolsService, 'getAllForReq').callsFake((filter) => {
      console.log(`\nSchoolsService.getAllForReq called\n`);
      return {
        status: 400,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubServiceGetAll.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      message: 'Request is not valid',
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * get all fail with exception
   */
  it('should get all fail with exception', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubServiceGetAll = sinon.stub(SchoolsService, 'getAllForReq').callsFake((filter) => {
      console.log(`\nSchoolsService.getAllForReq called\n`);
      throw new Error('Test error');
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubServiceGetAll.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
  }).timeout(10000);
});
