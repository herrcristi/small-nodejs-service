const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');
const RolesPermissions = require('../../../services/roles.permissions.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const SchedulesService = require('../../../services/schedules/schedules.service.js');

/**
 * what a student or a professor sees of the schedules (RolesPermissions): the list and the details of the ones of its
 * scope, their students by the setting of the school (classmates); a failure to read what it sees is returned
 */
describe('Schedules Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', tenantID: 'school1', userID: 'user1', roles: ['student'] };
  const student = { groupIDs: [], scheduleIDs: [] };
  student.scheduleIDs = ['s1'];
  const scope = { id: 'user1', professor: null, student, ...student };
  const getObj = () => ({ id: 's1', name: 'Name', students: [{ id: 'user1' }, { id: 'user2' }] });

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * the list: the filter of the scope, the classmates hidden by the setting
   */
  it('should getAllForReq only the schedules of the student', async () => {
    // stub: the scope, the reads, the setting hides the classmates
    const stubScope = sinon.stub(RolesPermissions, 'getScope').resolves({ status: 200, value: scope });
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').resolves({ status: 200, value: [getObj()] });
    sinon.stub(DbOpsUtils, 'getAllCount').resolves({ status: 200, value: 1 });
    sinon.stub(ReferencesUtils, 'populateReferences').resolves({ status: 200, value: true });
    const stubSettings = sinon
      .stub(SchoolsRest, 'getSettings')
      .resolves({ status: 200, value: { classmates: 'hide' } });

    // call
    const res = await SchedulesService.getAllForReq({ query: {} }, { ..._ctx });

    // check: only its own, with only itself in the students
    chai.expect(stubGetAll.firstCall.args[1].filter.$and[1]).to.deep.equal({ id: { $in: ['s1'] } });
    chai.expect(res.value.data).to.deep.equal([{ id: 's1', name: 'Name', students: [{ id: 'user1' }] }]);

    // case: the setting can not be read
    stubSettings.resolves({ status: 500, error: { message: 'Database failure' } });
    chai.expect((await SchedulesService.getAllForReq({ query: {} }, { ..._ctx })).status).to.equal(500);

    // case: the scope can not be read
    stubScope.resolves({ status: 500, error: { message: 'Database failure' } });
    chai.expect((await SchedulesService.getAllForReq({ query: {} }, { ..._ctx })).status).to.equal(500);
  }).timeout(10000);

  /**
   * the details: only one of its scope (another one: 404, as one that does not exist), the classmates by the setting
   */
  it('should getOneForReq only one of the student', async () => {
    // stub: the scope, the read, the setting hides the classmates
    const stubScope = sinon.stub(RolesPermissions, 'getScope').resolves({ status: 200, value: scope });
    const stubGetOne = sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: getObj() });
    const stubSettings = sinon
      .stub(SchoolsRest, 'getSettings')
      .resolves({ status: 200, value: { classmates: 'hide' } });

    // call
    const res = await SchedulesService.getOneForReq('s1', { id: 1, students: 1 }, { ..._ctx });

    // check: with only itself in the students
    chai.expect(res).to.deep.equal({ status: 200, value: { id: 's1', name: 'Name', students: [{ id: 'user1' }] } });

    // case: one that is not of its scope: not read, 404
    stubGetOne.resetHistory();
    const resOther = await SchedulesService.getOneForReq('s2', null, { ..._ctx });
    chai.expect(resOther.status).to.equal(404);
    chai.expect(stubGetOne.callCount).to.equal(0);

    // case: the read fails, the setting can not be read, the scope can not be read
    stubGetOne.resolves({ status: 404, error: { message: 'Not found' } });
    chai.expect((await SchedulesService.getOneForReq('s1', null, { ..._ctx })).status).to.equal(404);
    stubGetOne.resolves({ status: 200, value: getObj() });
    stubSettings.resolves({ status: 500, error: { message: 'Database failure' } });
    chai.expect((await SchedulesService.getOneForReq('s1', null, { ..._ctx })).status).to.equal(500);
    stubScope.resolves({ status: 500, error: { message: 'Database failure' } });
    chai.expect((await SchedulesService.getOneForReq('s1', null, { ..._ctx })).status).to.equal(500);
  }).timeout(10000);
});
