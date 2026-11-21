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
 * the account of a user: deleted (by the user, or when its invitation is not used in time); the schools keep their
 * records as traces by the removed notification, where the user is deleted
 */
describe('Users Service account', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users', tenantID: 'school1', userID: 'user1' };
  const fail = { status: 500, error: { message: 'Database failure' } };

  // a user
  const janeSmith = {
    id: 'user1',
    name: 'Jane Smith',
    email: 'jane.smith@testdomain.test',
    status: 'active',
    schools: [{ id: 'school1', name: 'North High School', roles: ['student', 'professor'] }],
  };

  before(async function () {});

  beforeEach(async function () {
    // the references, the events and the notifications
    sinon.stub(ReferencesUtils, 'populateReferences').resolves({ status: 200, value: true });
    sinon.stub(EventsRest, 'raiseEventForObject');
    sinon.stub(UsersRest, 'raiseNotification');
  });

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * delete a user: the record is deleted (nothing is kept), the removed notification carries the user as deleted (the
   * schools keep their records as traces, deleted, or delete them, by their setting)
   */
  it('should delete a user and notify it as deleted', async () => {
    // stub: the user is deleted
    const stubDelete = sinon.stub(DbOpsUtils, 'delete').resolves({ status: 200, value: janeSmith });

    // call
    const res = await UsersService.delete('user1', _ctx);

    // check: deleted, notified as deleted with its memberships
    chai.expect(res.status).to.equal(200);
    chai.expect(stubDelete.firstCall.args[1]).to.equal('user1');
    chai.expect(UsersRest.raiseNotification.firstCall.args[0]).to.equal('removed');
    chai.expect(UsersRest.raiseNotification.firstCall.args[1]).to.deep.equal([{ ...janeSmith, status: 'deleted' }]);

    // case: it can not be deleted: nothing notified
    stubDelete.resolves(fail);
    UsersRest.raiseNotification.resetHistory();
    chai.expect(await UsersService.delete('user1', _ctx)).to.deep.equal(fail);
    chai.expect(UsersRest.raiseNotification.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * the users whose invitation was not used in time are deleted (pending, created before the expiry); a failure is
   * skipped, the next ones are still deleted
   */
  it('should remove the users whose invitation expired', async () => {
    // stub: the expired pending users, one of them fails
    const newUser = {
      id: 'user2',
      email: 'john.brown@testdomain.test',
      schools: [{ id: 'school1', roles: ['student'] }],
    };
    const failing = { id: 'user4', email: 'emily.clark@testdomain.test', schools: [] };
    const invitedAgain = {
      id: 'user1',
      email: 'jane.smith@testdomain.test',
      schools: [{ id: 'school1', roles: ['student'] }],
    };
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').resolves({
      status: 200,
      value: [newUser, failing, invitedAgain],
    });
    const stubDelete = sinon.stub(DbOpsUtils, 'delete');
    stubDelete.onFirstCall().resolves({ status: 200, value: newUser });
    stubDelete.onSecondCall().resolves(fail);
    stubDelete.onThirdCall().resolves({ status: 200, value: invitedAgain });

    // call
    const before = Date.now();
    const res = await UsersService.deleteExpiredPending(_ctx);

    // check: only the pending ones created before the expiry
    const filter = stubGetAll.firstCall.args[1].filter;
    chai.expect(filter.status).to.equal('pending');
    const expiredBefore = new Date(filter.createdTimestamp.$lt).getTime();
    chai.expect(expiredBefore).to.be.at.most(before - ConfigSettings.getPendingExpiresIn() * 1000 + 1000);

    // check: deleted, the failure skipped
    chai.expect(res).to.deep.equal({ status: 200, value: ['user2', 'user1'] });
    chai.expect(stubDelete.args.map((args) => args[1])).to.deep.equal(['user2', 'user4', 'user1']);

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
