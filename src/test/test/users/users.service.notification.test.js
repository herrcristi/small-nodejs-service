const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const UsersService = require('../../../services/users/users.service.js');
const UsersRest = require('../../../services/rest/users.rest.js');

describe('Users Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };
  const fail = { status: 500, error: { message: 'Database failure' } };

  before(async function () {});

  beforeEach(async function () {
    // the notifications of the users (none is expected)
    sinon.stub(UsersRest, 'raiseNotification');
  });

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * schools notification: where a modified school is referenced in the memberships it is updated, a deleted school
   * is removed from the memberships; nothing is notified
   */
  it('should do notification with success', async () => {
    // stub: user1 references an older school1
    const stubUpdateReferences = sinon
      .stub(DbOpsUtils, 'updateManyReferences')
      .resolves({ status: 200, value: 1, ids: ['user1'] });
    const stubRemove = sinon.stub(DbOpsUtils, 'deleteManyReferences').resolves({ status: 200, value: 1 });

    // call
    const northSchool = { id: 'school1', name: 'North High School', status: 'disabled', modifiedCount: 3, extra: 1 };
    const southSchool = { id: 'school2', name: 'South High School' };
    const notification = { serviceName: 'schools', modified: [northSchool], removed: [southSchool] };
    const res = await UsersService.notification(notification, _ctx);

    // check: the referenced school (only its fields), the removed school, nothing notified
    chai.expect(res).to.deep.equal({ status: 200, value: ['user1'] });
    chai.expect(stubUpdateReferences.firstCall.args[1].fieldName).to.equal('schools[]');
    chai
      .expect(stubUpdateReferences.firstCall.args[2])
      .to.include({ id: 'school1', status: 'disabled', modifiedCount: 3 });
    chai.expect(stubUpdateReferences.firstCall.args[2]).to.not.have.property('extra');
    chai.expect(stubRemove.firstCall.args[2].id).to.equal('school2');
    chai.expect(UsersRest.raiseNotification.callCount).to.equal(0);

    // case: only one kind of change
    const resRemoved = await UsersService.notification({ serviceName: 'schools', removed: [southSchool] }, _ctx);
    chai.expect(resRemoved).to.deep.equal({ status: 200, value: [] });
    const resModified = await UsersService.notification({ serviceName: 'schools', modified: [northSchool] }, _ctx);
    chai.expect(resModified).to.deep.equal({ status: 200, value: ['user1'] });

    // case: failures
    stubRemove.resolves(fail);
    chai.expect(await UsersService.notification(notification, _ctx)).to.deep.equal(fail);
    stubUpdateReferences.resolves(fail);
    chai.expect(await UsersService.notification(notification, _ctx)).to.deep.equal(fail);
  }).timeout(10000);

  /**
   * a failure does not stop the schools notification: the next schools and the deleted schools are still done, and
   * the first failure is returned at the end
   */
  it('should do the next schools after a failure of the schools notification', async () => {
    // stub: the referenced school1 can not be updated
    const stubUpdateReferences = sinon.stub(DbOpsUtils, 'updateManyReferences');
    stubUpdateReferences.onFirstCall().resolves(fail);
    stubUpdateReferences.onSecondCall().resolves({ status: 200, value: 1, ids: ['user1'] });
    const stubRemove = sinon.stub(DbOpsUtils, 'deleteManyReferences').resolves({ status: 200, value: 1 });

    // call: school1 and school2 changed, school3 was deleted
    const northSchool = { id: 'school1', name: 'North High School', modifiedCount: 3 };
    const southSchool = { id: 'school2', name: 'South High School', modifiedCount: 2 };
    const westSchool = { id: 'school3', name: 'West High School' };
    const notification = { serviceName: 'schools', modified: [northSchool, southSchool], removed: [westSchool] };
    const res = await UsersService.notification(notification, _ctx);

    // check: the first failure is returned, school2 and school3 are still done
    chai.expect(res).to.deep.equal(fail);
    chai.expect(stubUpdateReferences.secondCall.args[2].id).to.equal('school2');
    chai.expect(stubRemove.firstCall.args[2].id).to.equal('school3');
  }).timeout(10000);

  /**
   * the notifications of the other services are ignored (no reference to them), an invalid one is refused
   */
  it('should notification fail validation', async () => {
    // call: another service
    const res = await UsersService.notification({ serviceName: 'events', modified: [{ id: 'event1' }] }, _ctx);
    chai.expect(res).to.deep.equal({ status: 200, value: false });

    // call: no service name
    const resInvalid = await UsersService.notification({ modified: [{ id: 'school1' }] }, _ctx);
    chai.expect(resInvalid.status).to.equal(400);
    chai.expect(resInvalid.error.message).to.equal('Failed to validate schema. Error: "serviceName" is required');
  }).timeout(10000);
});
