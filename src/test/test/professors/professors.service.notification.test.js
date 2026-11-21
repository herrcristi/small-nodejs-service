const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const ProfessorsService = require('../../../services/professors/professors.service.js');
const ProfessorsRest = require('../../../services/rest/professors.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Professors Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Professors', tenantID: 'school1' };
  const fail = { status: 500, error: { message: 'Database failure' } };

  // the users with the professor role in the school, as notified by the users service
  const janeSmith = {
    id: 'user1',
    name: 'Jane Smith',
    type: 'user',
    status: 'active',
    email: 'jane.smith@testdomain.test',
    modifiedCount: 4,
    schools: [{ id: 'school1', roles: ['professor'] }],
  };
  const johnBrown = {
    id: 'user2',
    name: 'John Brown',
    type: 'user',
    status: 'active',
    email: 'john.brown@testdomain.test',
    modifiedCount: 4,
    schools: [{ id: 'school1', roles: ['professor'] }],
  };
  const emilyClark = {
    id: 'user3',
    name: 'Emily Clark',
    type: 'user',
    status: 'active',
    email: 'emily.clark@testdomain.test',
    modifiedCount: 4,
    schools: [{ id: 'school1', roles: ['professor'] }],
  };
  const michaelDavis = {
    id: 'user4',
    name: 'Michael Davis',
    type: 'user',
    status: 'pending',
    email: 'michael.davis@testdomain.test',
    modifiedCount: 1,
    schools: [{ id: 'school1', roles: ['professor'] }],
  };

  /**
   * the professors records of the school (by id), read by getAllByIDs and getOne
   */
  const stubProfessorsRecords = (professors) => {
    sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake((config, ids) => {
      const found = ids.filter((id) => professors[id]);
      const records = found.map((id) => professors[id]);
      return { status: 200, value: records };
    });
    sinon.stub(DbOpsUtils, 'getOne').callsFake((config, id) => {
      if (!professors[id]) {
        return { status: 404, error: { message: 'Not found' } };
      }
      return { status: 200, value: professors[id] };
    });
  };

  /**
   * the action of each event that was raised
   */
  const getEventsActions = () => EventsRest.raiseEventForObject.args.map((args) => args[1]);

  beforeEach(async function () {
    // the events and the notifications of the professors
    sinon.stub(EventsRest, 'raiseEventForObject');
    sinon.stub(ProfessorsRest, 'raiseNotification');
  });

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * the users with the professor role: a new professor is created; the user copy of an existing one is updated (only an older
   * one): a trace is a professor again (with an event); the trace of a user invited again is kept while the user
   * is pending (nothing is changed or notified until its first login)
   */
  it('should save the professors of the users with the professor role', async () => {
    // stub: user2 is a professor, user3 a trace of a removed role, user4 a trace of a deleted account; user1 is new
    stubProfessorsRecords({
      user2: { id: 'user2', user: { id: 'user2', status: 'pending' } },
      user3: { id: 'user3', user: { id: 'user3', status: 'removed' } },
      user4: { id: 'user4', user: { id: 'user4', status: 'deleted' } },
    });
    sinon.stub(ReferencesUtils, 'populateReferences').callsFake((config, objInfo) => {
      objInfo.user = { id: objInfo.id, name: 'Jane Smith', status: 'active' };
      return { status: 200, value: true };
    });
    const stubPost = sinon.stub(DbOpsUtils, 'post').callsFake((config, objInfo) => ({ status: 201, value: objInfo }));
    const stubCopies = sinon.stub(DbOpsUtils, 'updateManyReferences').callsFake((config, ref, userCopy) => {
      return { status: 200, value: 1, ids: [userCopy.id] };
    });

    // call: user1 got the role, user2 logged in, user3 got the role again, user4 was invited again (pending)
    const notification = { serviceName: 'users', added: [janeSmith, michaelDavis], modified: [johnBrown, emilyClark] };
    const res = await ProfessorsService.notification(notification, _ctx);

    // check: the new professor, with the copy of its user
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubPost.callCount).to.equal(1);
    chai.expect(stubPost.firstCall.args[1]).to.include({ id: 'user1' });

    // check: the user copies of user2 and user3 (only the fields of the copy), not of the pending user4
    chai.expect(stubCopies.args.map((args) => args[2].id)).to.deep.equal(['user2', 'user3']);
    chai.expect(stubCopies.firstCall.args[1].fieldName).to.equal('user');
    chai.expect(stubCopies.firstCall.args[2]).to.not.have.property('schools');

    // check: the trace of user3 is a professor again (an event)
    chai.expect(getEventsActions()).to.deep.equal(['post', 'restore']);

    // check: the changed professors are notified (the copies of user2 and user3)
    const modified = ProfessorsRest.raiseNotification.args.filter((args) => args[0] === 'modified');
    const modifiedIDs = modified.map((args) => args[1][0].id);
    chai.expect(modifiedIDs).to.deep.equal(['user2', 'user3']);
  }).timeout(10000);

  /**
   * the users without the professor role (keep setting): a professor that never logged in leaves nothing; the others stay as
   * traces, removed (the role was removed) or deleted (the account was deleted), with an event; a trace is not changed
   */
  it('should keep the professors of the removed users as traces', async () => {
    // stub: the setting keeps them; user3 is already a trace; user4 never logged in; there is no record of user5
    sinon.stub(SchoolsRest, 'getSettings').resolves({ status: 200, value: { removedMembers: 'keep' } });
    stubProfessorsRecords({
      user1: { id: 'user1', user: { id: 'user1', status: 'active' } },
      user2: { id: 'user2', user: { id: 'user2', status: 'active' } },
      user3: { id: 'user3', user: { id: 'user3', status: 'removed' } },
      user4: { id: 'user4', user: { id: 'user4', status: 'pending' } },
    });
    const stubDelete = sinon.stub(DbOpsUtils, 'delete').resolves({ status: 200, value: { id: 'user4', user: {} } });
    const stubPut = sinon.stub(DbOpsUtils, 'put').callsFake((config, id, changes) => ({
      status: 200,
      value: { id, user: { id, name: 'Jane Smith', status: changes['user.status'] } },
    }));

    // call: user1 lost the role, user2 deleted its account, user3 lost it before
    const deletedAccount = { ...johnBrown, status: 'deleted' };
    const noRecord = { ...janeSmith, id: 'user5' };
    const notification = {
      serviceName: 'users',
      removed: [janeSmith, deletedAccount, emilyClark, michaelDavis, noRecord],
    };
    const res = await ProfessorsService.notification(notification, _ctx);

    // check: the setting of the school
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(SchoolsRest.getSettings.firstCall.args[0]).to.equal('school1');

    // check: the one that never logged in is deleted
    chai.expect(stubDelete.callCount).to.equal(1);
    chai.expect(stubDelete.firstCall.args[1]).to.equal('user4');

    // check: the traces, only the status of the user copy (the one that was already a trace is not changed)
    chai.expect(stubPut.args.map((args) => args[1])).to.deep.equal(['user1', 'user2']);
    chai.expect(stubPut.firstCall.args[2]).to.deep.equal({ 'user.status': 'removed' });
    chai.expect(stubPut.secondCall.args[2]).to.deep.equal({ 'user.status': 'deleted' });
    chai.expect(getEventsActions()).to.have.members(['delete', 'remove', 'accountDeleted']);

    // check: the traces are notified (the groups and the schedules keep their copies)
    const modified = ProfessorsRest.raiseNotification.args.filter((args) => args[0] === 'modified');
    chai.expect(modified.map((args) => args[1][0].id)).to.deep.equal(['user1', 'user2']);
  }).timeout(10000);

  /**
   * the users without the professor role (delete setting): the professors are deleted (one that is not there is fine)
   */
  it('should delete the professors of the removed users by the setting of the school', async () => {
    // stub: the setting deletes them; user2 has no record
    sinon.stub(SchoolsRest, 'getSettings').resolves({ status: 200, value: { removedMembers: 'delete' } });
    stubProfessorsRecords({ user1: { id: 'user1', user: { id: 'user1', status: 'active' } } });
    const stubDelete = sinon.stub(DbOpsUtils, 'delete');
    stubDelete.resolves({ status: 200, value: { id: 'user1', user: { name: 'Jane Smith' } } });
    const stubPut = sinon.stub(DbOpsUtils, 'put');

    // call
    const notification = { serviceName: 'users', removed: [janeSmith, johnBrown] };
    const res = await ProfessorsService.notification(notification, _ctx);

    // check: deleted, with the removed notification, no trace
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubDelete.callCount).to.equal(1);
    chai.expect(stubPut.callCount).to.equal(0);
    chai.expect(ProfessorsRest.raiseNotification.firstCall.args[0]).to.equal('removed');
  }).timeout(10000);

  /**
   * the failures of the users notification are returned (the notification can be processed again)
   */
  it('should return the failures of the users notification', async () => {
    // stub: every step fails, one after the other
    const stubAll = sinon.stub(DbOpsUtils, 'getAllByIDs').resolves(fail);
    const stubGet = sinon.stub(DbOpsUtils, 'getOne').resolves(fail);
    sinon.stub(ReferencesUtils, 'populateReferences').resolves({ status: 200, value: true });
    const stubPost = sinon.stub(DbOpsUtils, 'post').resolves(fail);
    const stubPut = sinon.stub(DbOpsUtils, 'put').resolves(fail);
    const stubCopies = sinon.stub(DbOpsUtils, 'updateManyReferences').resolves(fail);
    const stubDelete = sinon.stub(DbOpsUtils, 'delete').resolves(fail);
    const stubSettings = sinon.stub(SchoolsRest, 'getSettings').resolves(fail);
    const modified = { serviceName: 'users', modified: [janeSmith] };
    const removed = { serviceName: 'users', removed: [janeSmith] };
    const notify = (notification) => ProfessorsService.notification(notification, _ctx);

    // case: the existing professors can not be read
    chai.expect(await notify(modified)).to.deep.equal(fail);

    // case: a new professor can not be created
    stubAll.resolves({ status: 200, value: [] });
    chai.expect(await notify(modified)).to.deep.equal(fail);
    chai.expect(stubPost.callCount).to.equal(1);

    // case: the user copy can not be changed
    stubAll.resolves({ status: 200, value: [{ id: 'user1', user: { id: 'user1', status: 'pending' } }] });
    chai.expect(await notify(modified)).to.deep.equal(fail);

    // case: the changed professors can not be read to notify them
    stubCopies.resolves({ status: 200, value: 1, ids: ['user1'] });
    stubAll.onCall(stubAll.callCount + 1).resolves(fail);
    chai.expect(await notify(modified)).to.deep.equal(fail);

    // case: the setting can not be read
    chai.expect(await notify(removed)).to.deep.equal(fail);

    // case: the professor can not be read
    stubSettings.resolves({ status: 200, value: { removedMembers: 'keep' } });
    chai.expect(await notify(removed)).to.deep.equal(fail);

    // case: a professor that never logged in can not be deleted
    stubGet.resolves({ status: 200, value: { id: 'user1', user: { id: 'user1', status: 'pending' } } });
    chai.expect(await notify(removed)).to.deep.equal(fail);
    chai.expect(stubDelete.callCount).to.equal(1);

    // case: the trace can not be written
    stubGet.resolves({ status: 200, value: { id: 'user1', user: { id: 'user1', status: 'active' } } });
    chai.expect(await notify(removed)).to.deep.equal(fail);
    chai.expect(stubPut.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * classes notification: the copies of a modified class are updated, a deleted class is removed from the professors
   */
  it('should follow the classes in the professors', async () => {
    // stub
    const stubCopies = sinon
      .stub(DbOpsUtils, 'updateManyReferences')
      .resolves({ status: 200, value: 1, ids: ['user1'] });
    const stubRemove = sinon.stub(DbOpsUtils, 'deleteManyReferences').resolves({ status: 200, value: 1 });

    // call
    const mathematics = {
      id: 'class1',
      name: 'Mathematics',
      type: 'class',
      status: 'active',
      modifiedCount: 3,
      extra: 1,
    };
    const physics = { id: 'class2', name: 'Physics', type: 'class' };
    const notification = { serviceName: 'classes', modified: [mathematics], removed: [physics] };
    const res = await ProfessorsService.notification(notification, _ctx);

    // check: the copy (only its fields), the removed class
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubCopies.firstCall.args[1].fieldName).to.equal('classes[]');
    chai.expect(stubCopies.firstCall.args[2]).to.not.have.property('extra');
    chai.expect(stubRemove.firstCall.args[1].fieldName).to.equal('classes[]');
    chai.expect(stubRemove.firstCall.args[2]).to.deep.equal({ id: 'class2' });

    // case: only one kind of change
    const resRemoved = await ProfessorsService.notification({ serviceName: 'classes', removed: [physics] }, _ctx);
    chai.expect(resRemoved).to.deep.equal({ status: 200, value: true });
    const resModified = await ProfessorsService.notification({ serviceName: 'classes', modified: [mathematics] }, _ctx);
    chai.expect(resModified).to.deep.equal({ status: 200, value: true });

    // case: failures
    stubRemove.resolves(fail);
    chai.expect(await ProfessorsService.notification(notification, _ctx)).to.deep.equal(fail);
    stubCopies.resolves(fail);
    chai.expect(await ProfessorsService.notification(notification, _ctx)).to.deep.equal(fail);

    // case: no school
    const resNoTenant = await ProfessorsService.notification(notification, { ..._ctx, tenantID: undefined });
    chai.expect(resNoTenant.status).to.equal(400);
  }).timeout(10000);

  /**
   * schedules notification: a schedule is added to the professors it lists, removed from the others, and its copies
   * are updated; a deleted schedule is removed from all the professors
   */
  it('should follow the schedules of the professors', async () => {
    // stub
    const stubAdd = sinon.stub(DbOpsUtils, 'addManyReferences').resolves({ status: 200, value: 1 });
    const stubRemove = sinon.stub(DbOpsUtils, 'deleteManyReferences').resolves({ status: 200, value: 1 });
    const stubCopies = sinon
      .stub(DbOpsUtils, 'updateManyReferences')
      .resolves({ status: 200, value: 1, ids: ['user1'] });

    // call: the first one lists its professors, the second one is only a copy, the third one was deleted
    const listed = {
      id: 'schedule1',
      name: 'Mathematics Monday',
      status: 'active',
      modifiedCount: 2,
      professors: [{ id: 'user1' }, { id: 'user2' }],
    };
    const copyOnly = { id: 'schedule2', name: 'Mathematics Monday B', status: 'active', modifiedCount: 5 };
    const deleted = { id: 'schedule3', name: 'Mathematics Monday C' };
    const notification = { serviceName: 'schedules', added: [listed], modified: [copyOnly], removed: [deleted] };
    const res = await ProfessorsService.notification(notification, _ctx);

    // check: added to its professors, removed from the others, its copies (only the fields of the copy)
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubAdd.callCount).to.equal(1);
    chai.expect(stubAdd.firstCall.args[1]).to.deep.equal(['user1', 'user2']);
    chai.expect(stubAdd.firstCall.args[2].fieldName).to.equal('schedules[]');
    chai.expect(stubAdd.firstCall.args[3]).to.not.have.property('professors');
    chai.expect(stubRemove.firstCall.args[2]).to.deep.equal({ id: 'schedule1' });
    chai.expect(stubRemove.firstCall.args[4]).to.deep.equal({ filter: { id: { $nin: ['user1', 'user2'] } } });
    chai.expect(stubCopies.callCount).to.equal(2);

    // check: the deleted one, from all
    chai.expect(stubRemove.secondCall.args[2]).to.deep.equal({ id: 'schedule3' });
    chai.expect(stubRemove.secondCall.args[4]).to.equal(undefined);

    // case: only one kind of change
    const resRemoved = await ProfessorsService.notification({ serviceName: 'schedules', removed: [deleted] }, _ctx);
    chai.expect(resRemoved).to.deep.equal({ status: 200, value: true });
    const resModified = await ProfessorsService.notification({ serviceName: 'schedules', modified: [listed] }, _ctx);
    chai.expect(resModified).to.deep.equal({ status: 200, value: true });

    // case: failures (the calls so far: 4 removals)
    stubRemove.onCall(4).resolves(fail);
    chai
      .expect(await ProfessorsService.notification({ serviceName: 'schedules', removed: [deleted] }, _ctx))
      .to.deep.equal(fail);
    stubCopies.resolves(fail);
    chai
      .expect(await ProfessorsService.notification({ serviceName: 'schedules', modified: [copyOnly] }, _ctx))
      .to.deep.equal(fail);
    stubRemove.resolves(fail);
    chai
      .expect(await ProfessorsService.notification({ serviceName: 'schedules', modified: [listed] }, _ctx))
      .to.deep.equal(fail);
    stubAdd.resolves(fail);
    chai
      .expect(await ProfessorsService.notification({ serviceName: 'schedules', modified: [listed] }, _ctx))
      .to.deep.equal(fail);

    // case: no school
    const resNoTenant = await ProfessorsService.notification(notification, { ..._ctx, tenantID: undefined });
    chai.expect(resNoTenant.status).to.equal(400);
  }).timeout(10000);

  /**
   * the notifications of the other services are ignored (no copy of them), an invalid one is refused
   */
  it('should ignore other services and refuse an invalid notification', async () => {
    // call: another service
    const res = await ProfessorsService.notification(
      { serviceName: 'locations', modified: [{ id: 'location1' }] },
      _ctx
    );
    chai.expect(res).to.deep.equal({ status: 200, value: false });

    // call: no service name
    const resInvalid = await ProfessorsService.notification({ modified: [{ id: 'user1' }] }, _ctx);
    chai.expect(resInvalid.status).to.equal(400);
    chai.expect(resInvalid.error.message).to.equal('Failed to validate schema. Error: "serviceName" is required');
  }).timeout(10000);
});
