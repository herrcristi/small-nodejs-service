const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const StudentsConstants = require('../../../services/students/students.constants.js');
const StudentsService = require('../../../services/students/students.service.js');

describe('Students Controller', function () {
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
    const testStudents = _.cloneDeep(TestConstants.Students);

    // stub
    let stubService = sinon.stub(StudentsService, 'getAllForReq').callsFake((filter) => {
      console.log(`\nStudentsService.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: testStudents,
          meta: { count: testStudents.length, skip: 0, limit: 0 },
        },
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${StudentsConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      data: [...testStudents],
      meta: {
        count: testStudents.length,
        limit: 0,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    // stub
    let stubService = sinon.stub(StudentsService, 'getOne').callsFake(() => {
      console.log(`\nStudentsService.getOne called\n`);
      return {
        status: 200,
        value: testStudent,
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${StudentsConstants.ApiPath}/${testStudent.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testStudent,
    });
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    // stub
    let stubService = sinon.stub(StudentsService, 'post').callsFake((filter) => {
      console.log(`\nStudentsService.post called\n`);
      return {
        status: 201,
        value: { ...testStudent },
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${StudentsConstants.ApiPath}`)
      .send({ ...testStudent });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testStudent,
    });
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    // stub
    let stubService = sinon.stub(StudentsService, 'delete').callsFake((filter) => {
      console.log(`\nStudentsService.delete called\n`);
      return {
        status: 200,
        value: testStudent,
      };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${StudentsConstants.ApiPath}/${testStudent.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testStudent,
    });
  }).timeout(10000);

  /**
   * put with success
   */
  it('should put with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    // stub
    let stubService = sinon.stub(StudentsService, 'put').callsFake((filter) => {
      console.log(`\nStudentsService.put called\n`);
      return {
        status: 200,
        value: testStudent,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${StudentsConstants.ApiPath}/${testStudent.id}`)
      .send({ ...testStudent });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testStudent,
    });
  }).timeout(10000);

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    // stub
    let stubService = sinon.stub(StudentsService, 'patch').callsFake((filter) => {
      console.log(`\nStudentsService.patch called\n`);
      return {
        status: 200,
        value: testStudent,
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${StudentsConstants.ApiPath}/${testStudent.id}`)
      .send({ set: { ...testStudent } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testStudent,
    });
  }).timeout(10000);
});
