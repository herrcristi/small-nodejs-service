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
    let stubServiceGetAll = sinon.stub(SchoolsService, 'getAll').callsFake((filter) => {
      console.log(`\nSchoolService.getAll called\n`);
      return { value: testSchools };
    });

    let stubServiceGetAllCount = sinon.stub(SchoolsService, 'getAllCount').callsFake((filter) => {
      console.log(`\nSchoolService.getAllCount called\n`);
      return { value: testSchools.length };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubServiceGetAll.callCount).to.equal(1);
    chai.expect(stubServiceGetAllCount.callCount).to.equal(1);
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
   * get all partial data applying filter with success
   */
  it('should get all partial data applying filter with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubServiceGetAll = sinon.stub(SchoolsService, 'getAll').callsFake((filter) => {
      console.log(`\nSchoolService.getAll called\n`);
      return { value: testSchools };
    });

    let stubServiceGetAllCount = sinon.stub(SchoolsService, 'getAllCount').callsFake((filter) => {
      console.log(`\nSchoolService.getAllCount called\n`);
      return { value: testSchools.length + 1 };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${SchoolsConstants.ApiPath}?name!=/school/i&limit=2&skip=0`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(206);
    chai.expect(stubServiceGetAll.callCount).to.equal(1);
    chai.expect(stubServiceGetAllCount.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      data: [...testSchools],
      meta: {
        count: testSchools.length + 1,
        limit: 2,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * get all failed with exception
   */
  it('should get all failed with exception', async () => {
    // stub
    sinon.stub(SchoolsService, 'getAll').throws('Test exception');

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test exception');
  }).timeout(10000);
});
