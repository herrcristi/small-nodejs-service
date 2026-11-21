const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const GroupsService = require('../../../services/groups/groups.service.js');
const GroupsRest = require('../../../services/rest/groups.rest.js');

describe('Groups Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Groups', tenantID: 'school1' };
  const fail = { status: 500, error: { message: 'Database failure' } };

  // the students, as notified by the students service
  const janeSmith = {
    id: 'user1',
    type: 'student',
    status: 'disabled',
    modifiedCount: 6,
    user: { name: 'Jane Smith' },
    extra: 1,
  };
  const johnBrown = { id: 'user2', type: 'student', status: 'active', user: { name: 'John Brown' } };

  beforeEach(async function () {
    // the notifications of the groups
    sinon.stub(GroupsRest, 'raiseNotification');
  });

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * students notification: the copies of a modified student are updated, a deleted student is removed from its
   * groups; the groups that changed are notified (the schedules keep the students of their groups)
   */
  it('should follow the students in the groups and notify the changed groups', async () => {
    // stub: group1 had an older copy of user1, group2 has user2
    const stubCopies = sinon
      .stub(DbOpsUtils, 'updateManyReferences')
      .resolves({ status: 200, value: 1, ids: ['group1'] });
    const stubHaving = sinon.stub(DbOpsUtils, 'getAllByReference').resolves({ status: 200, value: [{ id: 'group2' }] });
    const stubRemove = sinon.stub(DbOpsUtils, 'deleteManyReferences').resolves({ status: 200, value: 1 });
    const groups = [{ id: 'group1' }, { id: 'group2' }];
    const stubRead = sinon.stub(DbOpsUtils, 'getAllByIDs').resolves({ status: 200, value: groups });

    // call
    const notification = { serviceName: 'students', modified: [janeSmith], removed: [johnBrown] };
    const res = await GroupsService.notification(notification, _ctx);

    // check: the copy (only its fields, with its status), the removed student
    chai.expect(stubCopies.firstCall.args[1].fieldName).to.equal('students[]');
    chai.expect(stubCopies.firstCall.args[2]).to.include({ id: 'user1', status: 'disabled' });
    chai.expect(stubCopies.firstCall.args[2]).to.not.have.property('extra');
    chai.expect(stubHaving.firstCall.args[2]).to.equal('user2');
    chai.expect(stubRemove.firstCall.args[2].id).to.equal('user2');

    // check: the changed groups are notified
    chai.expect(res).to.deep.equal({ status: 200, value: ['group1', 'group2'] });
    chai.expect(stubRead.firstCall.args[1]).to.deep.equal(['group1', 'group2']);
    chai.expect(GroupsRest.raiseNotification.firstCall.args[0]).to.equal('modified');

    // case: only a deleted student
    const resRemoved = await GroupsService.notification({ serviceName: 'students', removed: [johnBrown] }, _ctx);
    chai.expect(resRemoved).to.deep.equal({ status: 200, value: ['group2'] });

    // case: failures
    stubRead.resolves(fail);
    chai.expect(await GroupsService.notification(notification, _ctx)).to.deep.equal(fail);
    stubRemove.resolves(fail);
    chai.expect(await GroupsService.notification(notification, _ctx)).to.deep.equal(fail);
    stubHaving.resolves(fail);
    chai.expect(await GroupsService.notification(notification, _ctx)).to.deep.equal(fail);
    stubCopies.resolves(fail);
    chai.expect(await GroupsService.notification(notification, _ctx)).to.deep.equal(fail);

    // case: no changed group: nothing is notified
    stubCopies.resolves({ status: 200, value: 0, ids: [] });
    GroupsRest.raiseNotification.resetHistory();
    const resNone = await GroupsService.notification({ serviceName: 'students', modified: [janeSmith] }, _ctx);
    chai.expect(resNone).to.deep.equal({ status: 200, value: [] });
    chai.expect(GroupsRest.raiseNotification.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * students notification of a trace linked to the user invited again (previousID): the copies take its new id first,
   * then the copy is updated
   */
  it('should follow the new id of a linked student in the groups', async () => {
    // stub: group1 has the copy with the previous id
    const stubID = sinon
      .stub(DbOpsUtils, 'updateManyReferencesID')
      .resolves({ status: 200, value: 1, ids: ['group1'] });
    const stubCopies = sinon
      .stub(DbOpsUtils, 'updateManyReferences')
      .resolves({ status: 200, value: 1, ids: ['group1'] });
    sinon.stub(DbOpsUtils, 'getAllByIDs').resolves({ status: 200, value: [{ id: 'group1' }] });

    // call
    const linked = { id: 'user1', name: 'Jane Smith', modifiedCount: 3, previousID: 'old1' };
    const notification = { serviceName: 'students', modified: [linked] };
    const res = await GroupsService.notification(notification, _ctx);

    // check: the new id first, then the copy (without previousID)
    chai.expect(res).to.deep.equal({ status: 200, value: ['group1'] });
    chai.expect(stubID.firstCall.args.slice(2, 4)).to.deep.equal(['old1', 'user1']);
    chai.expect(stubID.firstCall.args[1].fieldName).to.equal('students[]');
    chai.expect(stubID.calledBefore(stubCopies)).to.equal(true);
    chai.expect(stubCopies.firstCall.args[2]).to.not.have.property('previousID');

    // case: the new id can not be written
    stubID.resolves(fail);
    chai.expect(await GroupsService.notification(notification, _ctx)).to.deep.equal(fail);
  }).timeout(10000);

  /**
   * schedules notification: a schedule is added to the groups it lists, removed from the others, and its copies are
   * updated; a deleted schedule is removed from all the groups
   */
  it('should follow the schedules of the groups', async () => {
    // stub
    const stubAdd = sinon.stub(DbOpsUtils, 'addManyReferences').resolves({ status: 200, value: 1 });
    const stubRemove = sinon.stub(DbOpsUtils, 'deleteManyReferences').resolves({ status: 200, value: 1 });
    const stubCopies = sinon.stub(DbOpsUtils, 'updateManyReferences').resolves({ status: 200, value: 1, ids: [] });

    // call: the first one lists its groups, the second one is only a copy, the third one was deleted
    const listed = { id: 'schedule1', name: 'Mathematics Monday', groups: [{ id: 'group1' }, { id: 'group2' }] };
    const copyOnly = { id: 'schedule2', name: 'Physics Tuesday', modifiedCount: 4 };
    const deleted = { id: 'schedule3', name: 'Chemistry Friday' };
    const notification = { serviceName: 'schedules', added: [listed], modified: [copyOnly], removed: [deleted] };
    const res = await GroupsService.notification(notification, _ctx);

    // check: added to its groups, removed from the others, its copies, the deleted one from all
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubAdd.firstCall.args[1]).to.deep.equal(['group1', 'group2']);
    chai.expect(stubAdd.firstCall.args[3]).to.not.have.property('groups');
    chai.expect(stubRemove.firstCall.args[4]).to.deep.equal({ filter: { id: { $nin: ['group1', 'group2'] } } });
    chai.expect(stubCopies.callCount).to.equal(2);
    chai.expect(stubRemove.secondCall.args[2]).to.deep.equal({ id: 'schedule3' });

    // case: only one kind of change
    const resRemoved = await GroupsService.notification({ serviceName: 'schedules', removed: [deleted] }, _ctx);
    chai.expect(resRemoved).to.deep.equal({ status: 200, value: true });
    const resModified = await GroupsService.notification({ serviceName: 'schedules', modified: [listed] }, _ctx);
    chai.expect(resModified).to.deep.equal({ status: 200, value: true });

    // case: failures (the calls so far: 4 removals)
    stubRemove.onCall(4).resolves(fail);
    chai
      .expect(await GroupsService.notification({ serviceName: 'schedules', removed: [deleted] }, _ctx))
      .to.deep.equal(fail);
    stubCopies.resolves(fail);
    chai
      .expect(await GroupsService.notification({ serviceName: 'schedules', modified: [copyOnly] }, _ctx))
      .to.deep.equal(fail);
    stubRemove.resolves(fail);
    chai
      .expect(await GroupsService.notification({ serviceName: 'schedules', modified: [listed] }, _ctx))
      .to.deep.equal(fail);
    stubAdd.resolves(fail);
    chai
      .expect(await GroupsService.notification({ serviceName: 'schedules', modified: [listed] }, _ctx))
      .to.deep.equal(fail);
  }).timeout(10000);

  /**
   * no school: refused
   */
  it('should notification failed tenant', async () => {
    // call: each source, without a school
    for (const serviceName of ['students', 'schedules']) {
      const res = await GroupsService.notification(
        { serviceName, modified: [{ id: 'id1' }] },
        { ..._ctx, tenantID: undefined }
      );

      // check
      chai.expect(res.status, serviceName).to.equal(400);
      chai.expect(res.error.message, serviceName).to.include('Missing tenant');
    }
  }).timeout(10000);

  /**
   * the notifications of the other services are ignored (no copy of them), an invalid one is refused
   */
  it('should ignore other services and refuse an invalid notification', async () => {
    // call: another service
    const res = await GroupsService.notification({ serviceName: 'locations', modified: [{ id: 'location1' }] }, _ctx);
    chai.expect(res).to.deep.equal({ status: 200, value: false });

    // call: no service name
    const resInvalid = await GroupsService.notification({ modified: [{ id: 'group1' }] }, _ctx);
    chai.expect(resInvalid.status).to.equal(400);
    chai.expect(resInvalid.error.message).to.equal('Failed to validate schema. Error: "serviceName" is required');
  }).timeout(10000);
});
