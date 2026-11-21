const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const StudentsService = require('../../../services/students/students.service.js');
const StudentsRest = require('../../../services/rest/students.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Students Service', function () {
  const _ctx = {
    reqID: 'testReq',
    lang: 'en',
    service: 'Students',
    tenantID: 'school1',
    userID: 'admin-of-the-school',
  };
  const fail = { status: 500, error: { message: 'Database failure' } };

  // the student of a user, and the same student kept as a trace (its role was removed before)
  const janeSmith = {
    id: 'user1',
    name: 'Jane Smith',
    type: 'user',
    status: 'active',
    email: 'jane.smith@testdomain.test',
  };
  const studentRecord = { id: 'user1', type: 'student', user: janeSmith };
  const studentTrace = { ...studentRecord, user: { ...janeSmith, status: 'removed' } };

  beforeEach(async function () {
    // the events and the notifications of the students
    sinon.stub(EventsRest, 'raiseEventForObject');
    sinon.stub(StudentsRest, 'raiseNotification');
  });

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * delete removes the student role of the user in the school; the student follows by the setting of the school (keep:
   * a trace, removed)
   */
  it('should delete by removing the student role in the school', async () => {
    // stub: the student, the role, the setting (keep), the trace
    sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: studentRecord });
    const stubRole = sinon.stub(UsersRest, 'patchSchool').resolves({ status: 200, value: {} });
    sinon.stub(SchoolsRest, 'getSettings').resolves({ status: 200, value: { removedMembers: 'keep' } });
    const stubPut = sinon.stub(DbOpsUtils, 'put').resolves({ status: 200, value: studentTrace });
    sinon.stub(DbOpsUtils, 'updateManyReferences').resolves({ status: 200, value: 0, ids: [] });
    sinon.stub(DbOpsUtils, 'getAllByIDs').resolves({ status: 200, value: [studentTrace] });

    // call
    const res = await StudentsService.delete('user1', _ctx);

    // check: the role of this school is removed, the student is kept as a trace
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.id).to.equal('user1');
    chai.expect(stubRole.firstCall.args[0]).to.equal('user1');
    chai
      .expect(stubRole.firstCall.args[1])
      .to.deep.equal({ remove: { schools: [{ id: 'school1', roles: ['student'] }] } });
    chai.expect(stubPut.firstCall.args[2]).to.deep.equal({ 'user.status': 'removed' });
    chai.expect(EventsRest.raiseEventForObject.firstCall.args[1]).to.equal('remove');
  }).timeout(10000);

  /**
   * delete a trace: it is deleted for good (its references follow, the removed notification), the role is not touched
   */
  it('should delete a trace for good', async () => {
    // stub: a trace, its delete
    sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: studentTrace });
    const stubRole = sinon.stub(UsersRest, 'patchSchool');
    const stubDelete = sinon.stub(DbOpsUtils, 'delete').resolves({ status: 200, value: studentTrace });

    // call
    const res = await StudentsService.delete('user1', _ctx);

    // check: deleted, with the event and the removed notification
    chai.expect(res.status).to.equal(200);
    chai.expect(stubDelete.firstCall.args[1]).to.equal('user1');
    chai.expect(stubRole.callCount).to.equal(0);
    chai.expect(EventsRest.raiseEventForObject.firstCall.args[1]).to.equal('delete');
    chai.expect(StudentsRest.raiseNotification.firstCall.args[0]).to.equal('removed');

    // case: it can not be deleted: the error
    stubDelete.resolves(fail);
    chai.expect(await StudentsService.delete('user1', _ctx)).to.deep.equal(fail);
  }).timeout(10000);

  /**
   * delete fail: no school, the student can not be read, the role can not be removed, the student can not follow
   */
  it('should delete fail', async () => {
    // stub: each step fails, one after the other
    const stubGet = sinon.stub(DbOpsUtils, 'getOne').resolves(fail);
    const stubRole = sinon.stub(UsersRest, 'patchSchool').resolves(fail);
    sinon.stub(SchoolsRest, 'getSettings').resolves(fail);

    // case: no school
    const resTenant = await StudentsService.delete('user1', { ..._ctx, tenantID: undefined });
    chai.expect(resTenant.status).to.equal(400);
    chai.expect(resTenant.error.message).to.include('Missing tenant');

    // case: the student can not be read
    chai.expect(await StudentsService.delete('user1', _ctx)).to.deep.equal(fail);

    // case: the role can not be removed
    stubGet.resolves({ status: 200, value: studentRecord });
    chai.expect(await StudentsService.delete('user1', _ctx)).to.deep.equal(fail);

    // case: the student can not follow (the setting can not be read)
    stubRole.resolves({ status: 200, value: {} });
    chai.expect(await StudentsService.delete('user1', _ctx)).to.deep.equal(fail);
  }).timeout(10000);
});
