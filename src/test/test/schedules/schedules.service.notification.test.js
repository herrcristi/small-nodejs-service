const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const SchedulesService = require('../../../services/schedules/schedules.service.js');
const SchedulesRest = require('../../../services/rest/schedules.rest.js');

describe('Schedules Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Schedules', tenantID: 'school1' };
  const fail = { status: 500, error: { message: 'Database failure' } };

  beforeEach(async function () {
    // the notifications of the schedules
    sinon.stub(SchedulesRest, 'raiseNotification');
  });

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * classes notification: the copies of a modified class are updated, a deleted class leaves its schedules; the
   * schedules that changed are notified (the students, professors and groups keep the class of their schedules)
   */
  it('should follow the classes of the schedules and notify the changed schedules', async () => {
    // stub: schedule1 had an older copy of class1, schedule2 has class2
    const stubCopies = sinon
      .stub(DbOpsUtils, 'updateManyReferences')
      .resolves({ status: 200, value: 1, ids: ['schedule1'] });
    const stubHaving = sinon
      .stub(DbOpsUtils, 'getAllByReference')
      .resolves({ status: 200, value: [{ id: 'schedule2' }] });
    const stubRemove = sinon.stub(DbOpsUtils, 'deleteManyReferences').resolves({ status: 200, value: 1 });
    const schedules = [{ id: 'schedule1' }, { id: 'schedule2' }];
    const stubRead = sinon.stub(DbOpsUtils, 'getAllByIDs').resolves({ status: 200, value: schedules });

    // call
    const mathematics = { id: 'class1', name: 'Mathematics', type: 'class', modifiedCount: 3, extra: 1 };
    const physics = { id: 'class2', name: 'Physics', type: 'class' };
    const notification = { serviceName: 'classes', modified: [mathematics], removed: [physics] };
    const res = await SchedulesService.notification(notification, _ctx);

    // check: the copy (only its fields), the removed class
    chai.expect(stubCopies.firstCall.args[1].fieldName).to.equal('class');
    chai.expect(stubCopies.firstCall.args[2]).to.not.have.property('extra');
    chai.expect(stubHaving.firstCall.args[2]).to.equal('class2');
    chai.expect(stubRemove.firstCall.args[2].id).to.equal('class2');

    // check: the changed schedules are notified
    chai.expect(res).to.deep.equal({ status: 200, value: ['schedule1', 'schedule2'] });
    chai.expect(stubRead.firstCall.args[1]).to.deep.equal(['schedule1', 'schedule2']);
    chai.expect(SchedulesRest.raiseNotification.firstCall.args[0]).to.equal('modified');

    // case: only a deleted class, that no schedule has: nothing is notified
    stubHaving.resolves({ status: 200, value: [] });
    SchedulesRest.raiseNotification.resetHistory();
    const resRemoved = await SchedulesService.notification({ serviceName: 'classes', removed: [physics] }, _ctx);
    chai.expect(resRemoved).to.deep.equal({ status: 200, value: [] });
    chai.expect(SchedulesRest.raiseNotification.callCount).to.equal(0);

    // case: only a modified class
    const resModified = await SchedulesService.notification({ serviceName: 'classes', modified: [mathematics] }, _ctx);
    chai.expect(resModified).to.deep.equal({ status: 200, value: ['schedule1'] });

    // case: failures
    stubRead.resolves(fail);
    chai.expect(await SchedulesService.notification(notification, _ctx)).to.deep.equal(fail);
    stubRemove.resolves(fail);
    chai.expect(await SchedulesService.notification(notification, _ctx)).to.deep.equal(fail);
    stubHaving.resolves(fail);
    chai.expect(await SchedulesService.notification(notification, _ctx)).to.deep.equal(fail);
    stubCopies.resolves(fail);
    chai.expect(await SchedulesService.notification(notification, _ctx)).to.deep.equal(fail);
  }).timeout(10000);

  /**
   * locations, professors, groups and students notifications: the copies of a modified one are updated, a deleted one
   * is removed from the schedules; nothing is notified (nobody keeps them from the schedules)
   */
  it('should follow the locations, professors, groups and students of the schedules', async () => {
    const sources = {
      locations: 'schedules[].location',
      professors: 'professors[]',
      groups: 'groups[]',
      students: 'students[]',
    };

    for (const serviceName in sources) {
      // stub
      const stubCopies = sinon
        .stub(DbOpsUtils, 'updateManyReferences')
        .resolves({ status: 200, value: 1, ids: ['schedule1'] });
      const stubRemove = sinon.stub(DbOpsUtils, 'deleteManyReferences').resolves({ status: 200, value: 1 });

      // call
      const modified = { id: `${serviceName}1`, name: 'Modified', modifiedCount: 2, extra: 1 };
      const removed = { id: `${serviceName}2`, name: 'Removed' };
      const notification = { serviceName, modified: [modified], removed: [removed] };
      const res = await SchedulesService.notification(notification, _ctx);

      // check: the copy (only its fields), the removed one; nothing notified
      chai.expect(res, serviceName).to.deep.equal({ status: 200, value: ['schedule1'] });
      chai.expect(stubCopies.firstCall.args[1].fieldName, serviceName).to.equal(sources[serviceName]);
      chai.expect(stubCopies.firstCall.args[2], serviceName).to.not.have.property('extra');
      chai.expect(stubRemove.firstCall.args[2].id, serviceName).to.equal(`${serviceName}2`);
      chai.expect(SchedulesRest.raiseNotification.callCount, serviceName).to.equal(0);

      // case: only one kind of change
      const resRemoved = await SchedulesService.notification({ serviceName, removed: [removed] }, _ctx);
      chai.expect(resRemoved, serviceName).to.deep.equal({ status: 200, value: [] });
      const resModified = await SchedulesService.notification({ serviceName, modified: [modified] }, _ctx);
      chai.expect(resModified, serviceName).to.deep.equal({ status: 200, value: ['schedule1'] });

      // case: failures
      stubRemove.resolves(fail);
      chai.expect(await SchedulesService.notification(notification, _ctx), serviceName).to.deep.equal(fail);
      stubCopies.resolves(fail);
      chai.expect(await SchedulesService.notification(notification, _ctx), serviceName).to.deep.equal(fail);

      stubCopies.restore();
      stubRemove.restore();
    }
  }).timeout(10000);

  /**
   * no school: refused
   */
  it('should notification failed tenant', async () => {
    // call: each source, without a school
    for (const serviceName of ['classes', 'locations', 'professors', 'groups', 'students']) {
      const notification = { serviceName, modified: [{ id: 'id1' }] };
      const res = await SchedulesService.notification(notification, { ..._ctx, tenantID: undefined });

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
    const res = await SchedulesService.notification({ serviceName: 'events', modified: [{ id: 'event1' }] }, _ctx);
    chai.expect(res).to.deep.equal({ status: 200, value: false });

    // call: no service name
    const resInvalid = await SchedulesService.notification({ modified: [{ id: 'schedule1' }] }, _ctx);
    chai.expect(resInvalid.status).to.equal(400);
    chai.expect(resInvalid.error.message).to.equal('Failed to validate schema. Error: "serviceName" is required');
  }).timeout(10000);
});
