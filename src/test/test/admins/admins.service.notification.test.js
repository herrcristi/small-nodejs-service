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
  const removedTimestamp = '2026-11-01T10:00:00.000Z';

  /**
   * a user with the admin role in the school, as notified by the users service
   */
  const getUser = (id, name, email, status) => ({
    id,
    name,
    type: 'user',
    status,
    email,
    modifiedCount: 4,
    schools: [{ id: 'school1', roles: ['admin'] }],
  });
  const anaPop = getUser('user1', 'Ana Pop', 'ana.pop@testdomain.test', 'active');
  const danIon = getUser('user2', 'Dan Ion', 'dan.ion@testdomain.test', 'active');
  const ioanaLup = getUser('user3', 'Ioana Lup', 'ioana.lup@testdomain.test', 'active');
  const mihaiPopa = getUser('user4', 'Mihai Popa', 'mihai.popa@testdomain.test', 'pending');

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
   * the users with the admin role: a new admin is created; the status of an existing one follows its user (a trace
   * is a admin again, with an event); the user copies are updated (only the older ones)
   */
  it('should save the admins of the users with the admin role', async () => {
    // stub: user2 is a admin (pending until it logged in), user3 is a trace (its role was removed); user1 is new
    stubAdminsRecords({
      user2: { id: 'user2', status: 'pending' },
      user3: { id: 'user3', status: 'disabled', removedTimestamp },
    });
    sinon.stub(ReferencesUtils, 'populateReferences').callsFake((config, objInfo) => {
      objInfo.user = { id: objInfo.id, name: 'Ana Pop', status: 'active' };
      return { status: 200, value: true };
    });
    const stubPost = sinon.stub(DbOpsUtils, 'post').callsFake((config, objInfo) => ({ status: 201, value: objInfo }));
    const stubPut = sinon.stub(DbOpsUtils, 'put').callsFake((config, id, changes) => ({
      status: 200,
      value: { id, ...changes, user: { name: 'Ioana Lup' } },
    }));
    const stubCopies = sinon.stub(DbOpsUtils, 'updateManyReferences').callsFake((config, ref, userCopy) => {
      const ids = userCopy.id === 'user2' ? ['user2'] : [];
      return { status: 200, value: ids.length, ids };
    });

    // call: user1 got the role, user2 logged in, user3 got the role again
    const notification = { serviceName: 'users', added: [anaPop], modified: [danIon, ioanaLup] };
    const res = await AdminsService.notification(notification, _ctx);

    // check: the new admin, with the status of its user
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubPost.callCount).to.equal(1);
    chai.expect(stubPost.firstCall.args[1]).to.include({ id: 'user1', status: 'active' });

    // check: the status follows the user (no event: the users service has it); the trace is a admin again
    // (active, not removed), with the restore event
    chai.expect(stubPut.callCount).to.equal(2);
    chai.expect(stubPut.firstCall.args[1]).to.equal('user2');
    chai.expect(stubPut.firstCall.args[2]).to.include({ status: 'active', removedTimestamp: null });
    chai.expect(stubPut.secondCall.args[1]).to.equal('user3');
    chai.expect(stubPut.secondCall.args[2]).to.include({ status: 'active', removedTimestamp: null });
    chai.expect(getEventsActions()).to.deep.equal(['post', 'restore']);

    // check: the user copies of the existing ones, only the fields of the copy
    chai.expect(stubCopies.callCount).to.equal(2);
    chai.expect(stubCopies.firstCall.args[1].fieldName).to.equal('user');
    chai.expect(stubCopies.firstCall.args[2]).to.not.have.property('schools');
  }).timeout(10000);

  /**
   * the users without the admin role (keep setting): a user that never logged in leaves nothing; the others stay as
   * traces, disabled (the role was removed) or deleted (the account was deleted), with an event
   */
  it('should keep the admins of the removed users as traces', async () => {
    // stub: the setting keeps them; user3 is already a trace; user4 never logged in; there is no record of user5
    sinon.stub(SchoolsRest, 'getSettings').resolves({ status: 200, value: { removedMembers: 'keep' } });
    stubAdminsRecords({
      user1: { id: 'user1', status: 'active' },
      user2: { id: 'user2', status: 'active' },
      user3: { id: 'user3', status: 'disabled', removedTimestamp },
    });
    const stubDelete = sinon.stub(DbOpsUtils, 'delete').resolves({ status: 200, value: { id: 'user4', user: {} } });
    const stubPut = sinon.stub(DbOpsUtils, 'put').callsFake((config, id, changes) => ({
      status: 200,
      value: { id, ...changes, user: { name: 'Ana Pop' } },
    }));
    sinon.stub(DbOpsUtils, 'updateManyReferences').callsFake((config, ref, userCopy) => {
      const ids = userCopy.id === 'user3' ? ['user3'] : [];
      return { status: 200, value: ids.length, ids };
    });

    // call: user1 lost the role, user2 deleted its account, user3 lost it before
    const deletedAccount = { ...danIon, status: 'deleted' };
    const noRecord = getUser('user5', 'Vlad Rus', 'vlad.rus@testdomain.test', 'active');
    const notification = { serviceName: 'users', removed: [anaPop, deletedAccount, ioanaLup, mihaiPopa, noRecord] };
    const res = await AdminsService.notification(notification, _ctx);

    // check: the setting of the school
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(SchoolsRest.getSettings.firstCall.args[0]).to.equal('school1');

    // check: the one that never logged in is deleted
    chai.expect(stubDelete.callCount).to.equal(1);
    chai.expect(stubDelete.firstCall.args[1]).to.equal('user4');

    // check: the traces (the one that was already a trace is not changed)
    chai.expect(stubPut.callCount).to.equal(2);
    chai.expect(stubPut.firstCall.args[1]).to.equal('user1');
    chai.expect(stubPut.firstCall.args[2]).to.include({ status: 'disabled' });
    chai.expect(stubPut.firstCall.args[2].removedTimestamp).to.be.a('string');
    chai.expect(stubPut.secondCall.args[1]).to.equal('user2');
    chai.expect(stubPut.secondCall.args[2]).to.include({ status: 'deleted' });
    chai.expect(getEventsActions()).to.include.members(['disable', 'accountDeleted', 'delete']);
  }).timeout(10000);

  /**
   * the users without the admin role (delete setting): the admins are deleted (one that is not there is fine)
   */
  it('should delete the admins of the removed users by the setting of the school', async () => {
    // stub: the setting deletes them; user2 has no record
    sinon.stub(SchoolsRest, 'getSettings').resolves({ status: 200, value: { removedMembers: 'delete' } });
    const stubDelete = sinon.stub(DbOpsUtils, 'delete');
    stubDelete.onFirstCall().resolves({ status: 200, value: { id: 'user1', user: { name: 'Ana Pop' } } });
    stubDelete.onSecondCall().resolves({ status: 404, error: { message: 'Not found' } });
    const stubPut = sinon.stub(DbOpsUtils, 'put');

    // call
    const notification = { serviceName: 'users', removed: [anaPop, danIon] };
    const res = await AdminsService.notification(notification, _ctx);

    // check: deleted, with the removed notification, no trace
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubDelete.callCount).to.equal(2);
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
    const modified = { serviceName: 'users', modified: [anaPop] };
    const removed = { serviceName: 'users', removed: [anaPop] };
    const removedPending = { serviceName: 'users', removed: [mihaiPopa] };
    const notify = (notification) => AdminsService.notification(notification, _ctx);

    // case: the existing admins can not be read
    chai.expect(await notify(modified)).to.deep.equal(fail);

    // case: a new admin can not be created
    stubAll.resolves({ status: 200, value: [] });
    chai.expect(await notify(modified)).to.deep.equal(fail);
    chai.expect(stubPost.callCount).to.equal(1);

    // case: the status can not be changed
    stubAll.resolves({ status: 200, value: [{ id: 'user1', status: 'pending' }] });
    chai.expect(await notify(modified)).to.deep.equal(fail);

    // case: the user copy can not be changed
    stubAll.resolves({ status: 200, value: [{ id: 'user1', status: 'active' }] });
    chai.expect(await notify(modified)).to.deep.equal(fail);

    // case: the setting can not be read
    chai.expect(await notify(removed)).to.deep.equal(fail);

    // case: a admin can not be deleted
    stubSettings.resolves({ status: 200, value: { removedMembers: 'keep' } });
    chai.expect(await notify(removedPending)).to.deep.equal(fail);
    chai.expect(stubDelete.callCount).to.equal(1);

    // case: the admin can not be read
    chai.expect(await notify(removed)).to.deep.equal(fail);

    // case: the trace can not be written
    stubGet.resolves({ status: 200, value: { id: 'user1', status: 'active' } });
    chai.expect(await notify(removed)).to.deep.equal(fail);

    // case: the user copy of the trace can not be changed
    stubGet.resolves({ status: 200, value: { id: 'user1', status: 'disabled', removedTimestamp } });
    chai.expect(await notify(removed)).to.deep.equal(fail);
    chai.expect(stubPut.callCount).to.equal(2);
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
