const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const AdminsService = require('../../../services/admins/admins.service.js');
const AdminsRest = require('../../../services/rest/admins.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Admins Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Admins', tenantID: 'school1' };
  const fail = { status: 500, error: { message: 'Database failure' } };

  // the users with the admin role in the school, as notified by the users service
  const janeSmith = {
    id: 'user1',
    name: 'Jane Smith',
    type: 'user',
    status: 'active',
    email: 'jane.smith@testdomain.test',
    modifiedCount: 4,
    schools: [{ id: 'school1', roles: ['admin'] }],
  };
  const johnBrown = {
    id: 'user2',
    name: 'John Brown',
    type: 'user',
    status: 'active',
    email: 'john.brown@testdomain.test',
    modifiedCount: 4,
    schools: [{ id: 'school1', roles: ['admin'] }],
  };
  const emilyClark = {
    id: 'user3',
    name: 'Emily Clark',
    type: 'user',
    status: 'active',
    email: 'emily.clark@testdomain.test',
    modifiedCount: 4,
    schools: [{ id: 'school1', roles: ['admin'] }],
  };
  const michaelDavis = {
    id: 'user4',
    name: 'Michael Davis',
    type: 'user',
    status: 'pending',
    email: 'michael.davis@testdomain.test',
    modifiedCount: 1,
    schools: [{ id: 'school1', roles: ['admin'] }],
  };

  /**
   * the admins records of the school (by id), read by getAllByIDs and getOne
   */
  const stubAdminsRecords = (admins) => {
    sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake((config, ids) => {
      const found = ids.filter((id) => admins[id]);
      const records = found.map((id) => admins[id]);
      return { status: 200, value: records };
    });
    sinon.stub(DbOpsUtils, 'getOne').callsFake((config, id) => {
      if (!admins[id]) {
        return { status: 404, error: { message: 'Not found' } };
      }
      return { status: 200, value: admins[id] };
    });
  };

  /**
   * the action of each event that was raised
   */
  const getEventsActions = () => EventsRest.raiseEventForObject.args.map((args) => args[1]);

  beforeEach(async function () {
    // the events and the notifications of the admins
    sinon.stub(EventsRest, 'raiseEventForObject');
    sinon.stub(AdminsRest, 'raiseNotification');
  });

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * the users with the admin role: a new admin is created; the user copy of an existing one is updated (only an older
   * one): a trace is an admin again (with an event); the trace of a user invited again is kept while the user
   * is pending (nothing is changed or notified until its first login)
   */
  it('should save the admins of the users with the admin role', async () => {
    // stub: user2 is an admin, user3 a trace of a removed role, user4 a trace of a deleted account; user1 is new
    stubAdminsRecords({
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
    const res = await AdminsService.notification(notification, _ctx);

    // check: the new admin, with the copy of its user
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubPost.callCount).to.equal(1);
    chai.expect(stubPost.firstCall.args[1]).to.include({ id: 'user1' });

    // check: the user copies of user2 and user3 (only the fields of the copy), not of the pending user4
    chai.expect(stubCopies.args.map((args) => args[2].id)).to.deep.equal(['user2', 'user3']);
    chai.expect(stubCopies.firstCall.args[1].fieldName).to.equal('user');
    chai.expect(stubCopies.firstCall.args[2]).to.not.have.property('schools');

    // check: the trace of user3 is an admin again (an event)
    chai.expect(getEventsActions()).to.deep.equal(['post', 'restore']);

    // check: nothing is notified (no other service keeps copies of the admins)
    const modified = AdminsRest.raiseNotification.args.filter((args) => args[0] === 'modified');
    chai.expect(modified.length).to.equal(0);
  }).timeout(10000);

  /**
   * the users without the admin role (keep setting): an admin that never logged in leaves nothing; the others stay as
   * traces, removed (the role was removed) or deleted (the account was deleted), with an event; a trace is not changed
   */
  it('should keep the admins of the removed users as traces', async () => {
    // stub: the setting keeps them; user3 is already a trace; user4 never logged in; there is no record of user5
    sinon.stub(SchoolsRest, 'getSettings').resolves({ status: 200, value: { removedMembers: 'keep' } });
    stubAdminsRecords({
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
    const res = await AdminsService.notification(notification, _ctx);

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
  }).timeout(10000);

  /**
   * the users without the admin role (delete setting): the admins are deleted (one that is not there is fine)
   */
  it('should delete the admins of the removed users by the setting of the school', async () => {
    // stub: the setting deletes them; user2 has no record
    sinon.stub(SchoolsRest, 'getSettings').resolves({ status: 200, value: { removedMembers: 'delete' } });
    stubAdminsRecords({ user1: { id: 'user1', user: { id: 'user1', status: 'active' } } });
    const stubDelete = sinon.stub(DbOpsUtils, 'delete');
    stubDelete.resolves({ status: 200, value: { id: 'user1', user: { name: 'Jane Smith' } } });
    const stubPut = sinon.stub(DbOpsUtils, 'put');

    // call
    const notification = { serviceName: 'users', removed: [janeSmith, johnBrown] };
    const res = await AdminsService.notification(notification, _ctx);

    // check: deleted, with the removed notification, no trace
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubDelete.callCount).to.equal(1);
    chai.expect(stubPut.callCount).to.equal(0);
    chai.expect(AdminsRest.raiseNotification.firstCall.args[0]).to.equal('removed');
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
    const notify = (notification) => AdminsService.notification(notification, _ctx);

    // case: the existing admins can not be read
    chai.expect(await notify(modified)).to.deep.equal(fail);

    // case: a new admin can not be created
    stubAll.resolves({ status: 200, value: [] });
    chai.expect(await notify(modified)).to.deep.equal(fail);
    chai.expect(stubPost.callCount).to.equal(1);

    // case: the user copy can not be changed
    stubAll.resolves({ status: 200, value: [{ id: 'user1', user: { id: 'user1', status: 'pending' } }] });
    chai.expect(await notify(modified)).to.deep.equal(fail);

    // case: the setting can not be read
    chai.expect(await notify(removed)).to.deep.equal(fail);

    // case: the admin can not be read
    stubSettings.resolves({ status: 200, value: { removedMembers: 'keep' } });
    chai.expect(await notify(removed)).to.deep.equal(fail);

    // case: an admin that never logged in can not be deleted
    stubGet.resolves({ status: 200, value: { id: 'user1', user: { id: 'user1', status: 'pending' } } });
    chai.expect(await notify(removed)).to.deep.equal(fail);
    chai.expect(stubDelete.callCount).to.equal(1);

    // case: the trace can not be written
    stubGet.resolves({ status: 200, value: { id: 'user1', user: { id: 'user1', status: 'active' } } });
    chai.expect(await notify(removed)).to.deep.equal(fail);
    chai.expect(stubPut.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * the notifications of the other services are ignored (no copy of them), an invalid one is refused
   */
  it('should ignore other services and refuse an invalid notification', async () => {
    // call: another service
    const res = await AdminsService.notification({ serviceName: 'locations', modified: [{ id: 'location1' }] }, _ctx);
    chai.expect(res).to.deep.equal({ status: 200, value: false });

    // call: no service name
    const resInvalid = await AdminsService.notification({ modified: [{ id: 'user1' }] }, _ctx);
    chai.expect(resInvalid.status).to.equal(400);
    chai.expect(resInvalid.error.message).to.equal('Failed to validate schema. Error: "serviceName" is required');
  }).timeout(10000);
});
