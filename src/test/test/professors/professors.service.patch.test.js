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
const ProfessorsConstants = require('../../../services/professors/professors.constants.js');
const ProfessorsService = require('../../../services/professors/professors.service.js');
const ProfessorsRest = require('../../../services/rest/professors.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Professors Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Professors' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const testProfessors = _.cloneDeep(TestConstants.Professors);
    const testProfessor = testProfessors[0];

    const patchReq = {
      set: {
        ...testProfessor,
      },
    };
    delete patchReq.set.id;
    delete patchReq.set.user;
    delete patchReq.set.type;
    delete patchReq.set._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchObj) => {
      console.log(`DbOpsUtils.patch called`);
      return {
        status: 200,
        value: { ...testProfessor },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`EventsRest.raiseEventForObject called`);
    });

    let stubProfessorsRest = sinon.stub(ProfessorsRest, 'raiseNotification').callsFake(() => {
      console.log(`ProfessorsRest raiseNotification called`);
    });

    // call
    let res = await ProfessorsService.patch(testProfessor.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubProfessorsRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testProfessor.id,
        user: testProfessor.user,
        type: testProfessor.type,
      },
    });
  }).timeout(10000);

  /**
   * patch failed no tenant
   */
  it('should patch failed tenant', async () => {
    // call
    let res = await ProfessorsService.patch('id', {}, { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * patch fail validation
   */
  it('should patch fail validation', async () => {
    const testProfessors = _.cloneDeep(TestConstants.Professors);
    const testProfessor = testProfessors[0];

    const patchReq = {
      set: {
        ...testProfessor,
      },
    };

    // call
    let res = await ProfessorsService.patch(testProfessor.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "set.id" is not allowed');
  }).timeout(10000);

  /**
   * patch fail references
   */
  it('should patch fail references', async () => {
    const testProfessors = _.cloneDeep(TestConstants.Professors);
    const testProfessor = testProfessors[0];

    const patchReq = {
      set: {
        ...testProfessor,
      },
    };
    delete patchReq.set.id;
    delete patchReq.set.user;
    delete patchReq.set.type;
    delete patchReq.set._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await ProfessorsService.patch(testProfessor.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * patch fail patch
   */
  it('should patch fail patch', async () => {
    const testProfessors = _.cloneDeep(TestConstants.Professors);
    const testProfessor = testProfessors[0];

    const patchReq = {
      set: {
        ...testProfessor,
      },
    };
    delete patchReq.set.id;
    delete patchReq.set.user;
    delete patchReq.set.type;
    delete patchReq.set._lang_en;

    // stub
    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchObj) => {
      console.log(`DbOpsUtils.patch called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await ProfessorsService.patch(testProfessor.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
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
