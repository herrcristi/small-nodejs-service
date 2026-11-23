const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const AdminsService = require('../../../services/admins/admins.service.js');
const AdminsRest = require('../../../services/rest/admins.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Admins Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Admins', tenantID: 'school1', userID: 'admin-of-the-school' };
  const fail = { status: 500, error: { message: 'Database failure' } };

  // the admin of a user, and the same admin kept as a trace (its role was removed before)
  const janeSmith = {
    id: 'user1',
    name: 'Jane Smith',
    type: 'user',
    status: 'active',
    email: 'jane.smith@testdomain.test',
  };
  const adminRecord = { id: 'user1', type: 'admin', user: janeSmith };
  const adminTrace = { ...adminRecord, user: { ...janeSmith, status: 'removed' } };

  before(async function () {});

  beforeEach(async function () {
    // the events and the notifications of the admins
    sinon.stub(EventsRest, 'raiseEventForObject');
    sinon.stub(AdminsRest, 'raiseNotification');
  });

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * delete removes the admin role of the user in the school; the admin follows by the setting of the school (keep:
   * a trace, removed)
   */
  it('should delete by removing the admin role in the school', async () => {
    // stub: the admin, the role, the setting (keep), the trace
    sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: adminRecord });
    const stubRole = sinon.stub(UsersRest, 'patchSchool').resolves({ status: 200, value: {} });
    sinon.stub(SchoolsRest, 'getSettings').resolves({ status: 200, value: { removedMembers: 'keep' } });
    const stubPut = sinon.stub(DbOpsUtils, 'put').resolves({ status: 200, value: adminTrace });
    sinon.stub(DbOpsUtils, 'updateManyReferences').resolves({ status: 200, value: 0, ids: [] });
    sinon.stub(DbOpsUtils, 'getAllByIDs').resolves({ status: 200, value: [adminTrace] });

    // call
    const res = await AdminsService.delete('user1', _ctx);

    // check: the role of this school is removed, the admin is kept as a trace
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.id).to.equal('user1');
    chai.expect(stubRole.firstCall.args[0]).to.equal('user1');
    chai
      .expect(stubRole.firstCall.args[1])
      .to.deep.equal({ remove: { schools: [{ id: 'school1', roles: ['admin'] }] } });
    chai.expect(stubPut.firstCall.args[2]).to.deep.equal({ 'user.status': 'removed' });
    chai.expect(EventsRest.raiseEventForObject.firstCall.args[1]).to.equal('remove');
  }).timeout(10000);

  /**
   * delete a trace: it is deleted for good (its references follow, the removed notification), the role is not touched
   */
  it('should delete a trace for good', async () => {
    // stub: a trace, its delete
    const stubGet = sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: adminTrace });
    const stubRole = sinon.stub(UsersRest, 'patchSchool');
    const stubDelete = sinon.stub(DbOpsUtils, 'delete').resolves({ status: 200, value: adminTrace });

    // call
    const res = await AdminsService.delete('user1', _ctx);

    // check: the trace is read on the primary (a trace made by the request before is seen)
    chai.expect(stubGet.firstCall.args[4]).to.deep.equal({ readPreference: DbOpsUtils.Constants.ReadPrimary });

    // check: deleted, with the event and the removed notification
    chai.expect(res.status).to.equal(200);
    chai.expect(stubDelete.firstCall.args[1]).to.equal('user1');
    chai.expect(stubRole.callCount).to.equal(0);
    chai.expect(EventsRest.raiseEventForObject.firstCall.args[1]).to.equal('delete');
    chai.expect(AdminsRest.raiseNotification.firstCall.args[0]).to.equal('removed');

    // case: it can not be deleted: the error
    stubDelete.resolves(fail);
    chai.expect(await AdminsService.delete('user1', _ctx)).to.deep.equal(fail);
  }).timeout(10000);

  /**
   * delete fail: no school, the admin can not be read, the role can not be removed, the admin can not follow
   */
  it('should delete fail', async () => {
    // stub: each step fails, one after the other
    const stubGet = sinon.stub(DbOpsUtils, 'getOne').resolves(fail);
    const stubRole = sinon.stub(UsersRest, 'patchSchool').resolves(fail);
    sinon.stub(SchoolsRest, 'getSettings').resolves(fail);

    // case: no school
    const resTenant = await AdminsService.delete('user1', { ..._ctx, tenantID: undefined });
    chai.expect(resTenant.status).to.equal(400);
    chai.expect(resTenant.error.message).to.include('Missing tenant');

    // case: the admin can not be read
    chai.expect(await AdminsService.delete('user1', _ctx)).to.deep.equal(fail);

    // case: the role can not be removed
    stubGet.resolves({ status: 200, value: adminRecord });
    chai.expect(await AdminsService.delete('user1', _ctx)).to.deep.equal(fail);

    // case: the admin can not follow (the setting can not be read)
    stubRole.resolves({ status: 200, value: {} });
    chai.expect(await AdminsService.delete('user1', _ctx)).to.deep.equal(fail);
  }).timeout(10000);

  /**
   * an admin can not remove itself (another admin, or a portal admin, removes it)
   */
  it('should delete fail for the current admin', async () => {
    // stub: no read and no write are expected
    const stubGet = sinon.stub(DbOpsUtils, 'getOne');
    const stubRole = sinon.stub(UsersRest, 'patchSchool');

    // call: on itself
    const res = await AdminsService.delete(_ctx.userID, _ctx);

    // check: refused with the reason, nothing changed
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('You cannot remove yourself as admin');
    chai.expect(stubGet.callCount).to.equal(0);
    chai.expect(stubRole.callCount).to.equal(0);
  }).timeout(10000);
});
