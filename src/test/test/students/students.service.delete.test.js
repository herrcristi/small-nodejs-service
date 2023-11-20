const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils.js');
const TranslationsUtils = require('../../../core/utils/translations.utils.js');
const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');
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
   * delete with success
   */
  it('should delete with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    let stubBase = sinon.stub(DbOpsUtils, 'delete').callsFake((config, objID) => {
      console.log(`DbOpsUtils.delete called`);
      return {
        status: 200,
        value: { ...testStudent },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    let stubStudentsRest = sinon.stub(StudentsRest, 'raiseNotification').callsFake(() => {
      console.log(`StudentsRest raiseNotification called`);
    });

    // call
    let res = await StudentsService.delete(testStudent.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubStudentsRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testStudent.id,
        user: testStudent.user,
        type: testStudent.type,
      },
    });
  }).timeout(10000);

  /**
   * delete failed no tenant
   */
  it('should delete failed tenant', async () => {
    // call
    let res = await StudentsService.delete('id', { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * delete fail
   */
  it('should delete fail ', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'delete').callsFake((config, objID) => {
      console.log(`DbOpsUtils.delete called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await StudentsService.delete(testStudent.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);
});
