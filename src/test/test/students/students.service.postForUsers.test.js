const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const StudentsConstants = require('../../../services/students/students.constants.js');
const StudentsService = require('../../../services/students/students.service.js');
const StudentsRest = require('../../../services/rest/students.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Students Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Students' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * postForUsers with success
   */
  it('should postForUsers with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];
    const userID = testStudent.id;

    const postReq = {
      ...testStudent,
      classes: [{ id: testStudent.classes[0].id }],
    };
    delete postReq.user;
    delete postReq.type;
    delete postReq.groups;
    delete postReq._lang_en;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake((config, ids) => {
      console.log(`\nDbOpsUtils.getAllByIDs called. ids: ${JSON.stringify(ids, null, 2)}\n`);
      chai.expect(ids).to.have.deep.members([userID]);

      return {
        status: 200,
        value: [],
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake((config, objInfo) => {
      objInfo.user = testStudent.user;
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`DbOpsUtils.post called`);
      return {
        status: 201,
        value: { ...postObj, id: testStudent.id },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    let stubStudentsRest = sinon.stub(StudentsRest, 'raiseNotification').callsFake(() => {
      console.log(`StudentsRest raiseNotification called`);
    });

    // call
    let res = await StudentsService.postForUsers([postReq], _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubStudentsRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: [
        {
          id: testStudent.id,
          user: testStudent.user,
          type: testStudent.type,
        },
      ],
    });
  }).timeout(10000);

  /**
   * postForUsers no users
   */
  it('should postForUsers no users', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];
    const userID = testStudent.id;

    const postReq = {
      ...testStudent,
      classes: [{ id: testStudent.classes[0].id }],
    };
    delete postReq.user;
    delete postReq.type;
    delete postReq.groups;
    delete postReq._lang_en;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake((config, ids) => {
      console.log(`\nDbOpsUtils.getAllByIDs called. ids: ${JSON.stringify(ids, null, 2)}\n`);
      chai.expect(ids).to.have.deep.members([userID]);

      return {
        status: 200,
        value: [],
      };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`DbOpsUtils.post called`);
      return {
        status: 201,
        value: { ...postObj, id: testStudent.id },
      };
    });

    // call
    let res = await StudentsService.postForUsers([], _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(0);
    chai.expect(stubBase.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: [],
    });
  }).timeout(10000);

  /**
   * postForUsers failed no tenant
   */
  it('should postForUsers failed tenant', async () => {
    // call
    let res = await StudentsService.postForUsers([], { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * postForUsers fail get
   */
  it('should postForUsers fail get', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];
    const userID = testStudent.id;

    const postReq = {
      ...testStudent,
      classes: [{ id: testStudent.classes[0].id }],
    };
    delete postReq.user;
    delete postReq.type;
    delete postReq.groups;
    delete postReq._lang_en;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake((config, ids) => {
      console.log(`\nDbOpsUtils.getAllByIDs called. ids: ${JSON.stringify(ids, null, 2)}\n`);
      chai.expect(ids).to.have.deep.members([userID]);

      return {
        status: 500,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await StudentsService.postForUsers([postReq], _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error').toString() },
    });
  }).timeout(10000);

  /**
   * postForUsers success already created
   */
  it('should postForUsers success already created', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];
    const userID = testStudent.id;

    const postReq = {
      ...testStudent,
      classes: [{ id: testStudent.classes[0].id }],
    };
    delete postReq.user;
    delete postReq.type;
    delete postReq.groups;
    delete postReq._lang_en;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake((config, ids) => {
      console.log(`\nDbOpsUtils.getAllByIDs called. ids: ${JSON.stringify(ids, null, 2)}\n`);
      chai.expect(ids).to.have.deep.members([userID]);

      return {
        status: 200,
        value: [{ id: userID }],
      };
    });

    // call
    let res = await StudentsService.postForUsers([postReq], _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: [],
    });
  }).timeout(10000);

  /**
   * postForUsers fail post
   */
  it('should postForUsers fail post', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];
    const userID = testStudent.id;

    const postReq = {
      ...testStudent,
      classes: [{ id: testStudent.classes[0].id }],
    };
    delete postReq.user;
    delete postReq.type;
    delete postReq.groups;
    delete postReq._lang_en;

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake((config, ids) => {
      console.log(`\nDbOpsUtils.getAllByIDs called. ids: ${JSON.stringify(ids, null, 2)}\n`);
      chai.expect(ids).to.have.deep.members([userID]);

      return {
        status: 200,
        value: [],
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake((config, objInfo) => {
      objInfo.user = testStudent.user;
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'post').callsFake((config, postObj) => {
      console.log(`DbOpsUtils.post called`);
      return {
        status: 500,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await StudentsService.postForUsers([postReq], _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error').toString() },
    });
  }).timeout(10000);
});
