const _ = require('lodash');
const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const UsersService = require('../../../services/users/users.service.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

/**
 * a request reaches only the user itself or a member of the current school
 */
describe('Users Service for request', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users', tenantID: 'schoolA', userID: 'admin1' };

  const member = {
    id: 'member1',
    name: 'Member One',
    email: 'member.one@testdomain.test',
    status: 'active',
    schools: [
      { id: 'schoolA', name: 'School A', roles: ['student'] },
      { id: 'schoolB', name: 'School B', roles: ['admin'] },
    ],
  };
  const outsider = { id: 'outsider1', name: 'Outsider', schools: [{ id: 'schoolB', roles: ['admin'] }] };

  const stubWrites = () => {
    sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => ({ status: 200, value: true }));
    sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {});
    sinon.stub(UsersRest, 'raiseNotification').callsFake(() => {});
  };

  afterEach(async function () {
    sinon.restore();
  });

  it('should get the user itself without a membership check and with all its schools', async () => {
    const stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));

    const res = await UsersService.getOneForReq('admin1', { id: 1, schools: 1 }, _ctx);

    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.schools.map((s) => s.id)).to.deep.equal(['schoolA', 'schoolB']);
  });

  it('should get a member of the current school with only the current school', async () => {
    const stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));

    const res = await UsersService.getOneForReq('member1', null, _ctx);

    chai.expect(stubBase.callCount).to.equal(2); // membership check + get
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.schools).to.deep.equal([{ id: 'schoolA', name: 'School A', roles: ['student'] }]);
  });

  it('should get a member when the projection has no schools', async () => {
    sinon.stub(DbOpsUtils, 'getOne').callsFake((config, id, projection) => ({
      status: 200,
      value: projection?.name ? { id: 'member1', name: 'Member One' } : _.cloneDeep(member),
    }));

    const res = await UsersService.getOneForReq('member1', { id: 1, name: 1 }, _ctx);

    chai.expect(res).to.deep.equal({ status: 200, value: { id: 'member1', name: 'Member One' } });
  });

  it('should not get a user that is not a member of the current school', async () => {
    const stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(outsider) }));

    const res = await UsersService.getOneForReq('outsider1', null, _ctx);

    chai.expect(stubBase.callCount).to.equal(1); // only the membership check
    chai.expect(res.status).to.equal(404);
    chai.expect(res.error.message).to.equal('Not found outsider1');
  });

  it('should not tell if a user exists outside of the current school', async () => {
    sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({
      status: 404,
      error: { message: 'Not found nobody', error: new Error('Not found nobody') },
    }));

    const res = await UsersService.getOneForReq('nobody', null, _ctx);

    chai.expect(res.status).to.equal(404);
  });

  it('should not get another user without a current school', async () => {
    const stubBase = sinon.stub(DbOpsUtils, 'getOne');

    const res = await UsersService.getOneForReq('member1', null, { ..._ctx, tenantID: undefined });

    chai.expect(stubBase.callCount).to.equal(0);
    chai.expect(res.status).to.equal(404);
  });

  it('should not put a user that is not a member of the current school', async () => {
    sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(outsider) }));
    const stubPut = sinon.stub(DbOpsUtils, 'put');

    const res = await UsersService.putForReq('outsider1', { name: 'Changed' }, _ctx);

    chai.expect(res.status).to.equal(404);
    chai.expect(stubPut.callCount).to.equal(0);
  });

  it('should put a member of the current school without the other schools', async () => {
    sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
    const stubPut = sinon.stub(DbOpsUtils, 'put').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
    stubWrites();

    const res = await UsersService.putForReq('member1', { name: 'Changed' }, _ctx);

    chai.expect(stubPut.callCount).to.equal(1);
    chai.expect(res.status).to.equal(200);
    chai.expect(JSON.stringify(res.value)).to.not.include('schoolB');
  });

  it('should not put the status from a request', async () => {
    const stubGet = sinon.stub(DbOpsUtils, 'getOne');
    const stubPut = sinon.stub(DbOpsUtils, 'put');

    // the user itself and a member of the school
    for (const id of ['admin1', 'member1']) {
      stubGet.callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
      const res = await UsersService.putForReq(id, { status: 'disabled' }, _ctx);

      chai.expect(res.status).to.equal(400);
      chai.expect(res.error.message).to.include('"status" is not allowed');
    }
    chai.expect(stubPut.callCount).to.equal(0);
  });

  it('should not patch a user that is not a member of the current school', async () => {
    sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(outsider) }));
    const stubPatch = sinon.stub(DbOpsUtils, 'patch');

    const res = await UsersService.patchForReq('outsider1', { set: { name: 'Changed' } }, _ctx);

    chai.expect(res.status).to.equal(404);
    chai.expect(stubPatch.callCount).to.equal(0);
  });

  it('should patch a member of the current school without the other schools', async () => {
    sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
    const stubPatch = sinon.stub(DbOpsUtils, 'patch').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
    stubWrites();

    const res = await UsersService.patchForReq('member1', { set: { name: 'Changed' } }, _ctx);

    chai.expect(stubPatch.callCount).to.equal(1);
    chai.expect(res.status).to.equal(200);
    chai.expect(JSON.stringify(res.value)).to.not.include('schoolB');
  });

  it('should not patch the status from a request', async () => {
    sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
    const stubPatch = sinon.stub(DbOpsUtils, 'patch');

    const res = await UsersService.patchForReq('member1', { set: { status: 'disabled' } }, _ctx);

    chai.expect(res.status).to.equal(400);
    chai.expect(stubPatch.callCount).to.equal(0);
  });

  it('should activate only a pending user (internal, on login)', async () => {
    const stubPut = sinon.stub(DbOpsUtils, 'put').callsFake(() => ({ status: 200, value: { ...member } }));
    stubWrites();

    // activated: the condition is "still pending"
    let res = await UsersService.putStatus('member1', { status: 'active' }, _ctx);
    chai.expect(res.status).to.equal(200);
    chai.expect(stubPut.firstCall.args[0].condition).to.deep.equal({ status: 'pending' });

    // only to active, nothing else
    for (const objInfo of [{ status: 'disabled' }, { status: 'pending' }, { name: 'Changed' }, {}]) {
      res = await UsersService.putStatus('member1', objInfo, _ctx);
      chai.expect(res.status).to.equal(400);
    }
    chai.expect(stubPut.callCount).to.equal(1);
  });

  it('should keep a user that was disabled while the login runs disabled', async () => {
    // the condition does not match anymore
    sinon.stub(DbOpsUtils, 'put').callsFake(() => ({
      status: 404,
      error: { message: 'Not found member1', error: new Error('Not found member1') },
    }));
    sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: { ...member, status: 'disabled' } }));
    stubWrites();

    const res = await UsersService.putStatus('member1', { status: 'active' }, _ctx);

    chai.expect(res.status).to.equal(200);
    chai.expect(res.changed).to.equal(false);
    chai.expect(res.value.status).to.equal('disabled');
    chai.expect(EventsRest.raiseEventForObject.callCount).to.equal(0);
    chai.expect(UsersRest.raiseNotification.callCount).to.equal(0);
  });

  it('should answer not found when the user does not exist and fail on a database error', async () => {
    const notFound = { status: 404, error: { message: 'Not found x', error: new Error('Not found x') } };
    const stubPut = sinon.stub(DbOpsUtils, 'put').callsFake(() => notFound);
    sinon.stub(DbOpsUtils, 'getOne').callsFake(() => notFound);
    stubWrites();

    let res = await UsersService.putStatus('x', { status: 'active' }, _ctx);
    chai.expect(res.status).to.equal(404);

    // other errors are returned as they are (no reload)
    stubPut.callsFake(() => ({ status: 500, error: { message: 'Test error', error: new Error('Test error') } }));
    res = await UsersService.putStatus('x', { status: 'active' }, _ctx);
    chai.expect(res.status).to.equal(500);
    chai.expect(DbOpsUtils.getOne.callCount).to.equal(1);
  });

  describe('status by a portal admin', function () {
    const portalSchoolID = 'portalSchool';
    const _ctxPortal = { ..._ctx, tenantID: portalSchoolID, userID: 'portalAdmin1' };
    let previous;

    beforeEach(function () {
      previous = process.env.SMALL_API_PORTAL_SCHOOL_ID;
      process.env.SMALL_API_PORTAL_SCHOOL_ID = portalSchoolID;
    });

    afterEach(function () {
      if (previous === undefined) {
        delete process.env.SMALL_API_PORTAL_SCHOOL_ID;
      } else {
        process.env.SMALL_API_PORTAL_SCHOOL_ID = previous;
      }
    });

    it('should change the status only on the portal school', async () => {
      const stubPut = sinon.stub(DbOpsUtils, 'put');

      let res = await UsersService.putStatusForReq('member1', { status: 'disabled' }, _ctx /* schoolA */);
      chai.expect(res.status).to.equal(403);

      delete process.env.SMALL_API_PORTAL_SCHOOL_ID;
      res = await UsersService.putStatusForReq('member1', { status: 'disabled' }, { ..._ctx, tenantID: undefined });
      chai.expect(res.status).to.equal(403);

      chai.expect(stubPut.callCount).to.equal(0);
    });

    it('should allow pending -> active | disabled and active <-> disabled, never back to pending', async () => {
      const stubPut = sinon.stub(DbOpsUtils, 'put').callsFake((config, id, objInfo) => ({
        status: 200,
        value: { ...member, status: objInfo.status },
      }));
      stubWrites();

      let res = await UsersService.putStatusForReq('member1', { status: 'disabled' }, _ctxPortal);
      chai.expect(res.status).to.equal(200);
      chai.expect(res.value.status).to.equal('disabled');
      chai.expect(res.value.schools).to.equal(undefined); // not the schools of the user
      chai.expect(stubPut.lastCall.args[0].condition).to.deep.equal({ status: { $in: ['pending', 'active'] } });

      res = await UsersService.putStatusForReq('member1', { status: 'active' }, _ctxPortal);
      chai.expect(res.status).to.equal(200);
      chai.expect(stubPut.lastCall.args[0].condition).to.deep.equal({ status: { $in: ['pending', 'disabled'] } });

      // never to pending, nothing else than the status
      for (const objInfo of [{ status: 'pending' }, { status: 'unknown' }, { status: 'active', name: 'x' }, {}]) {
        res = await UsersService.putStatusForReq('member1', objInfo, _ctxPortal);
        chai.expect(res.status).to.equal(400);
      }
      chai.expect(stubPut.callCount).to.equal(2);
    });

    it('should not let a portal admin disable itself', async () => {
      const stubPut = sinon.stub(DbOpsUtils, 'put');

      const res = await UsersService.putStatusForReq('portalAdmin1', { status: 'disabled' }, _ctxPortal);

      chai.expect(res.status).to.equal(400);
      chai.expect(res.error.message).to.equal('Skipping disabling status of current user');
      chai.expect(stubPut.callCount).to.equal(0);
    });

    it('should change nothing when the user already has the status', async () => {
      sinon.stub(DbOpsUtils, 'put').callsFake(() => ({
        status: 404,
        error: { message: 'Not found member1', error: new Error('Not found member1') },
      }));
      sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: { ...member, status: 'active' } }));
      stubWrites();

      const res = await UsersService.putStatusForReq('member1', { status: 'active' }, _ctxPortal);

      chai.expect(res.status).to.equal(200);
      chai.expect(res.changed).to.equal(false);
      chai.expect(res.value.status).to.equal('active');
      chai.expect(EventsRest.raiseEventForObject.callCount).to.equal(0);
    });
  });
});
