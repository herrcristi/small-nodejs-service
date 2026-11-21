const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ConfigSettings = require('../../../services/config.settings.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const SchoolsConstants = require('../../../services/schools/schools.constants.js');
const SchoolsService = require('../../../services/schools/schools.service.js');

/**
 * the settings of a school (its admins), and the removal of the pending schools that nobody logged in to in time
 */
describe('Schools Service settings and expiry', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Schools', tenantID: 'school1' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * the settings with the defaults of the ones that are not set
   */
  it('should get the settings with the defaults', async () => {
    // stub: the school has no settings yet
    const stubGet = sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: { id: 'school1' } });

    // call
    const res = await SchoolsService.getSettings('school1', _ctx);

    // check: the defaults (the removed members are kept)
    chai.expect(stubGet.firstCall.args[1]).to.equal('school1');
    chai.expect(res).to.deep.equal({ status: 200, value: { removedMembers: 'keep' } });

    // case: set
    stubGet.resolves({ status: 200, value: { id: 'school1', settings: { removedMembers: 'delete' } } });
    const resSet = await SchoolsService.getSettings('school1', _ctx);
    chai.expect(resSet.value).to.deep.equal({ removedMembers: 'delete' });

    // case: the school can not be read
    stubGet.resolves({ status: 404, error: { message: 'Not found' } });
    const resFailed = await SchoolsService.getSettings('school1', _ctx);
    chai.expect(resFailed.status).to.equal(404);
  });

  /**
   * put the settings: validated, written, an event
   */
  it('should put the settings with an event', async () => {
    // stub: the write and the event
    const saved = { id: 'school1', name: 'North High School', settings: { removedMembers: 'delete' } };
    const stubPut = sinon.stub(DbOpsUtils, 'put').resolves({ status: 200, value: saved });
    const stubEvent = sinon.stub(EventsRest, 'raiseEventForObject');

    // call
    const res = await SchoolsService.putSettings('school1', { removedMembers: 'delete' }, _ctx);

    // check: only the settings are written, the event names the action
    chai.expect(res).to.deep.equal({ status: 200, value: { removedMembers: 'delete' } });
    chai.expect(stubPut.firstCall.args[1]).to.equal('school1');
    chai.expect(stubPut.firstCall.args[2]).to.deep.equal({ settings: { removedMembers: 'delete' } });
    chai.expect(stubEvent.firstCall.args[1]).to.equal('settings');

    // case: an unknown value: refused, nothing written
    const resInvalid = await SchoolsService.putSettings('school1', { removedMembers: 'archive' }, _ctx);
    chai.expect(resInvalid.status).to.equal(400);
    chai.expect(stubPut.callCount).to.equal(1);

    // case: the write fails: the error, no event
    stubPut.resolves({ status: 404, error: { message: 'Not found' } });
    const resFailed = await SchoolsService.putSettings('school1', { removedMembers: 'keep' }, _ctx);
    chai.expect(resFailed.status).to.equal(404);
    chai.expect(stubEvent.callCount).to.equal(1);
  });

  /**
   * the pending schools created before the expiry are deleted (with the expire event); a failure is logged and the
   * next ones are still deleted
   */
  it('should delete the expired pending schools', async () => {
    // stub: two expired schools, the first one is deleted, the second one fails
    const schools = [
      { id: 'school1', name: 'North High School' },
      { id: 'school2', name: 'South High School' },
    ];
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').resolves({ status: 200, value: schools });
    const stubDelete = sinon.stub(DbOpsUtils, 'delete');
    stubDelete.onFirstCall().resolves({ status: 200, value: schools[0] });
    stubDelete.onSecondCall().resolves({ status: 500, error: { message: 'Database failure' } });
    const stubEvent = sinon.stub(EventsRest, 'raiseEventForObject');
    const stubNotification = sinon.stub(SchoolsRest, 'raiseNotification');

    // call
    const before = Date.now();
    const res = await SchoolsService.deleteExpiredPending(_ctx);

    // check: only the pending ones created before the expiry
    const filter = stubGetAll.firstCall.args[1].filter;
    chai.expect(filter.status).to.equal('pending');
    const expiredBefore = new Date(filter.createdTimestamp.$lt).getTime();
    const expiresIn = ConfigSettings.getPendingExpiresIn() * 1000;
    chai.expect(expiredBefore).to.be.at.most(before - expiresIn + 1000);

    // check: the deleted one, with the expire event and the removed notification
    chai.expect(res).to.deep.equal({ status: 200, value: ['school1'] });
    chai.expect(stubEvent.firstCall.args[1]).to.equal('expire');
    chai.expect(stubNotification.firstCall.args[0]).to.equal('removed');

    // case: they can not be read: the error
    stubGetAll.resolves({ status: 500, error: { message: 'Database failure' } });
    const resFailed = await SchoolsService.deleteExpiredPending(_ctx);
    chai.expect(resFailed.status).to.equal(500);
  });

  /**
   * the cleanup runs regularly, in the portal school; its failures are only logged
   */
  it('should run the cleanup of the pending schools regularly', async () => {
    // stub: the clock (the init starts the timer again), the read of the schools
    const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').resolves({ status: 200, value: [] });
    const interval = SchoolsConstants.PendingCleanupInterval * 1000;

    // call: the init, then one interval
    await SchoolsService.init();
    await clock.tickAsync(interval);

    // check: run once, in the portal school
    chai.expect(stubGetAll.callCount).to.equal(1);
    chai.expect(stubGetAll.firstCall.args[2].tenantID).to.equal(process.env.SMALL_API_PORTAL_SCHOOL_ID);

    // case: it fails, or it throws: only logged, it runs again later
    stubGetAll.resolves({ status: 500, error: { message: 'Database failure' } });
    await clock.tickAsync(interval);
    stubGetAll.rejects(new Error('Database failure'));
    await clock.tickAsync(interval);
    chai.expect(stubGetAll.callCount).to.equal(3);
  });

  /**
   * an expiry shorter than an hour (SMALL_API_PENDING_EXPIRES_IN): the cleanup runs as often as the expiry, so an
   * expired school is removed at most one interval later
   */
  it('should run the cleanup of the pending schools as often as a short expiry', async () => {
    // stub: an expiry of 10 minutes, the clock (the init starts the timer again), the read of the schools
    process.env.SMALL_API_PENDING_EXPIRES_IN = '600';
    const clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').resolves({ status: 200, value: [] });

    // call: the init, then 10 minutes, then 10 more
    await SchoolsService.init();
    await clock.tickAsync(600 * 1000);
    const callsAfterOne = stubGetAll.callCount;
    await clock.tickAsync(600 * 1000);
    delete process.env.SMALL_API_PENDING_EXPIRES_IN;

    // check: run every 10 minutes (not after an hour)
    chai.expect(callsAfterOne).to.equal(1);
    chai.expect(stubGetAll.callCount).to.equal(2);
  });
});
