const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ConfigSettings = require('../../../services/config.settings.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const UsersConstants = require('../../../services/users/users.constants.js');
const UsersService = require('../../../services/users/users.service.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

/**
 * the account of a user: deleted by the user (kept as deleted, without memberships and personal fields), created again
 * by an invitation, and removed when its invitation is not used in time
 */
describe('Users Service account', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users', tenantID: 'school1', userID: 'user1' };
  const fail = { status: 500, error: { message: 'Database failure' } };

  // a user and the same user after its account was deleted
  const anaPop = {
    id: 'user1',
    name: 'Ana Pop',
    email: 'ana.pop@testdomain.test',
    status: 'active',
    schools: [{ id: 'school1', name: 'North High School', roles: ['student', 'professor'] }],
  };
  const anaPopDeleted = {
    id: 'user1',
    name: 'Ana Pop',
    email: 'ana.pop@testdomain.test',
    status: 'deleted',
    schools: [],
  };

  beforeEach(async function () {
    // the references, the events and the notifications
    sinon.stub(ReferencesUtils, 'populateReferences').resolves({ status: 200, value: true });
    sinon.stub(EventsRest, 'raiseEventForObject');
    sinon.stub(UsersRest, 'raiseNotification');
  });

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * delete the account: deleted, without memberships and personal fields (the id, the name and the email are kept);
   * the removed memberships are notified (the schools keep or delete its records)
   */
  it('should delete the account of a user', async () => {
    // stub: the user before, and after the patch
    sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: anaPop });
    const stubPatch = sinon.stub(DbOpsUtils, 'patch').resolves({ status: 200, value: anaPopDeleted });

    // call
    const res = await UsersService.deleteAccount('user1', _ctx);

    // check: the patch
    chai.expect(res.status).to.equal(200);
    const patchInfo = stubPatch.firstCall.args[2];
    chai.expect(patchInfo.set).to.include({ status: 'deleted' });
    chai.expect(patchInfo.set.schools).to.deep.equal([]);
    chai.expect(patchInfo.set.deletedTimestamp).to.be.a('string');
    chai.expect(patchInfo.unset).to.deep.equal(UsersConstants.ProfileFields);

    // check: its event, modified, and the removed memberships (with the deleted status)
    chai.expect(EventsRest.raiseEventForObject.firstCall.args[1]).to.equal('deleteAccount');
    const notifications = UsersRest.raiseNotification.args;
    chai.expect(notifications[0][0]).to.equal('modified');
    chai.expect(notifications[1][0]).to.equal('removed');
    chai.expect(notifications[1][1][0]).to.include({ id: 'user1', status: 'deleted' });
    chai.expect(notifications[1][1][0].schools[0].roles).to.deep.equal(['student', 'professor']);
  }).timeout(10000);

  /**
   * recreate the account of a deleted user (an invitation): pending, created now (its invitation expires like a new
   * one); a user that is not deleted is not changed
   */
  it('should recreate the account of a deleted user', async () => {
    // stub: the write (still deleted when it is written)
    const stubPut = sinon
      .stub(DbOpsUtils, 'put')
      .resolves({ status: 200, value: { ...anaPopDeleted, status: 'pending' } });
    const stubGet = sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: { ...anaPop, status: 'pending' } });

    // call
    const before = Date.now();
    const res = await UsersService.recreateAccount('user1', _ctx);

    // check: pending, created now, only if it is still deleted, with its event
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.status).to.equal('pending');
    const changes = stubPut.firstCall.args[2];
    chai.expect(changes.status).to.equal('pending');
    chai.expect(new Date(changes.createdTimestamp).getTime()).to.be.at.least(before);
    chai.expect(stubPut.firstCall.args[5]).to.deep.equal({ filter: { status: 'deleted' } });
    chai.expect(EventsRest.raiseEventForObject.firstCall.args[1]).to.equal('recreateAccount');

    // case: not deleted (pending, active or disabled): not changed, its current status
    stubPut.resolves({ status: 409, error: { message: 'Not changed' } });
    const resNotDeleted = await UsersService.recreateAccount('user1', _ctx);
    chai.expect(resNotDeleted.status).to.equal(200);
    chai.expect(resNotDeleted.value.status).to.equal('pending');
    chai.expect(stubGet.callCount).to.equal(1);

    // case: the user does not exist
    stubPut.resolves({ status: 404, error: { message: 'Not found' } });
    const resMissing = await UsersService.recreateAccount('user1', _ctx);
    chai.expect(resMissing.status).to.equal(404);
  }).timeout(10000);

  /**
   * the users whose invitation was not used in time: a new user is deleted, a recreated account is deleted again (its
   * traces stay); a failure is logged and the next ones are still removed
   */
  it('should remove the users whose invitation expired', async () => {
    // stub: the expired pending users
    const newUser = { id: 'user2', email: 'dan.ion@testdomain.test', schools: [{ id: 'school1', roles: ['student'] }] };
    const recreated = { ...anaPopDeleted, deletedTimestamp: '2026-11-01T10:00:00.000Z' };
    const failing = { id: 'user4', email: 'ioana.lup@testdomain.test', schools: [] };
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').resolves({
      status: 200,
      value: [newUser, recreated, failing],
    });
    const stubDelete = sinon.stub(DbOpsUtils, 'delete');
    stubDelete.onFirstCall().resolves({ status: 200, value: newUser });
    stubDelete.onSecondCall().resolves(fail);
    sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: { ...anaPop, status: 'pending' } });
    const stubPatch = sinon.stub(DbOpsUtils, 'patch').resolves({ status: 200, value: anaPopDeleted });

    // call
    const before = Date.now();
    const res = await UsersService.deleteExpiredPending(_ctx);

    // check: only the pending ones created before the expiry
    const filter = stubGetAll.firstCall.args[1].filter;
    chai.expect(filter.status).to.equal('pending');
    const expiredBefore = new Date(filter.createdTimestamp.$lt).getTime();
    chai.expect(expiredBefore).to.be.at.most(before - ConfigSettings.getPendingExpiresIn() * 1000 + 1000);

    // check: the new user deleted, the recreated account deleted again, the failure skipped
    chai.expect(res).to.deep.equal({ status: 200, value: ['user2', 'user1'] });
    chai.expect(stubDelete.firstCall.args[1]).to.equal('user2');
    chai.expect(stubPatch.firstCall.args[1]).to.equal('user1');
    chai.expect(stubDelete.secondCall.args[1]).to.equal('user4');

    // case: they can not be read
    stubGetAll.resolves(fail);
    chai.expect(await UsersService.deleteExpiredPending(_ctx)).to.deep.equal(fail);
  }).timeout(10000);

  /**
   * the cleanup runs regularly, in the portal school; its failures are only logged
   */
  it('should run the cleanup of the pending users regularly', async () => {
    // stub: the clock (the init starts the timer again), the read of the users
    const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').resolves({ status: 200, value: [] });
    const interval = UsersConstants.PendingCleanupInterval * 1000;

    // call: the init, then one interval
    await UsersService.init();
    await clock.tickAsync(interval);

    // check: run once, in the portal school
    chai.expect(stubGetAll.callCount).to.equal(1);
    chai.expect(stubGetAll.firstCall.args[2].tenantID).to.equal(process.env.SMALL_API_PORTAL_SCHOOL_ID);

    // case: it fails, or it throws: only logged, it runs again later
    stubGetAll.resolves(fail);
    await clock.tickAsync(interval);
    stubGetAll.rejects(new Error('Database failure'));
    await clock.tickAsync(interval);
    chai.expect(stubGetAll.callCount).to.equal(3);
  }).timeout(10000);
});
