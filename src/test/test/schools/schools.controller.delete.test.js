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
   * delete one with success
   */
  it('should delete one with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubServiceDeleteOne = sinon.stub(SchoolsService, 'delete').callsFake(() => {
      console.log(`\nSchoolService.delete called\n`);
      return { value: testSchool };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${SchoolsConstants.ApiPath}/${testSchool.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubServiceDeleteOne.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      id: testSchool.id,
      name: testSchool.name,
      type: testSchool.type,
      status: testSchool.status,
    });
  }).timeout(10000);

  /**
   * delete one not found
   */
  it('should delete one not found', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    let stubServiceDeleteOne = sinon.stub(SchoolsService, 'delete').callsFake((objID) => {
      console.log(`\nSchoolService.delete called\n`);
      console.log(objID);
      return { value: null };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${SchoolsConstants.ApiPath}/${testSchool.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(404);
    chai.expect(stubServiceDeleteOne.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('Not found');
    chai.expect(res.body.error).to.include(testSchool.id);
  }).timeout(10000);

  /**
   * delete one failed with exception
   */
  it('should delete one failed with exception', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // stub
    sinon.stub(SchoolsService, 'delete').throws('Test exception');

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${SchoolsConstants.ApiPath}/${testSchool.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test exception');
  }).timeout(10000);
});
