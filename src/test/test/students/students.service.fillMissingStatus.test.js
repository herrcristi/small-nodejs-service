const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const StudentsConstants = require('../../../services/students/students.constants.js');
const StudentsService = require('../../../services/students/students.service.js');
const StudentsDatabase = require('../../../services/students/students.database.js');
const StudentsRest = require('../../../services/rest/students.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');

describe('Students Service', function () {
  const fail = { status: 500, error: { message: 'Database failure' } };

  beforeEach(async function () {
    // the notifications of the students; no collection is opened (the database calls are stubs, also with IS_TEST_DB)
    sinon.stub(StudentsRest, 'raiseNotification');
    sinon.stub(StudentsDatabase, 'collection').resolves(null);
  });

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * the students written by an earlier version get the status of their user, in every school (the schools are read in
   * pages)
   */
  it('should complete the status of the students written by an earlier version', async () => {
    // stub: a full page of schools, then the last one; in school0 two students without status (one without a user copy)
    const batch = StudentsConstants.FillMissingStatusBatch;
    const firstPage = Array.from({ length: batch }, (value, index) => ({ id: `school${index}` }));
    const stubSchools = sinon.stub(SchoolsRest, 'getAll');
    stubSchools.onFirstCall().resolves({ status: 200, value: firstPage });
    stubSchools.onSecondCall().resolves({ status: 200, value: [{ id: 'portalSchool' }] });
    const students = [{ id: 'user1', user: { status: 'active' } }, { id: 'user2' }];
    const stubRead = sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter, ctx) => {
      const found = ctx.tenantID === 'school0' ? students : [];
      return { status: 200, value: found };
    });
    const stubPut = sinon.stub(DbOpsUtils, 'put').callsFake((config, id, changes) => ({
      status: 200,
      value: { id, ...changes, user: {} },
    }));
    sinon.stub(DbOpsUtils, 'getAllByIDs').resolves({ status: 200, value: students });

    // call
    const res = await StudentsService.fillMissingStatus();

    // check: every page of schools, the students without status
    chai.expect(res).to.deep.equal({ status: 200, value: ['user1', 'user2'] });
    chai.expect(stubSchools.firstCall.args[0]).to.include('skip=0');
    chai.expect(stubSchools.secondCall.args[0]).to.include(`skip=${batch}`);
    chai.expect(stubRead.callCount).to.equal(batch + 1);
    chai.expect(stubRead.firstCall.args[1].filter).to.deep.equal({ status: { $exists: false } });

    // check: the status of the user copy, pending without one
    chai.expect(stubPut.firstCall.args[2]).to.include({ status: 'active' });
    chai.expect(stubPut.secondCall.args[2]).to.include({ status: 'pending' });

    // check: the completed students are notified (their copies get the status)
    chai.expect(StudentsRest.raiseNotification.firstCall.args[0]).to.equal('modified');
  }).timeout(10000);

  /**
   * a school that fails is logged and the next ones are completed; the schools that can not be read stop it
   */
  it('should complete the status of the other schools when one fails', async () => {
    // stub: three schools, each fails in another step
    const schools = [{ id: 'school1' }, { id: 'school2' }, { id: 'school3' }];
    const stubSchools = sinon.stub(SchoolsRest, 'getAll').resolves({ status: 200, value: schools });
    sinon.stub(DbOpsUtils, 'getAll').callsFake((config, filter, ctx) => {
      if (ctx.tenantID === 'school1') {
        return fail;
      }
      return { status: 200, value: [{ id: `${ctx.tenantID}-user` }] };
    });
    sinon.stub(DbOpsUtils, 'put').callsFake((config, id) => {
      if (id === 'school2-user') {
        return fail;
      }
      return { status: 200, value: { id, user: {} } };
    });
    sinon.stub(DbOpsUtils, 'getAllByIDs').resolves(fail);

    // call
    const res = await StudentsService.fillMissingStatus();

    // check: school1 can not be read, school2 can not be written, school3 can not be notified
    chai.expect(res).to.deep.equal({ status: 200, value: [] });

    // case: the schools can not be read
    stubSchools.resolves(fail);
    chai.expect(await StudentsService.fillMissingStatus()).to.deep.equal(fail);
  }).timeout(10000);
});
