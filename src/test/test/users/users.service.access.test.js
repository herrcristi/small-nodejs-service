const _ = require('lodash');
const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const UsersService = require('../../../services/users/users.service.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

/**
 * the access of a request to a user (/users/:id, /users/:id/status, /users) and the activation at login
 *  - the user itself: all its data
 *  - an admin of the current school: a member of the school, only the current school is shown
 *  - a portal admin (on the portal school): any user, without its schools; only the name and the status are changed
 */
describe('Users Service access', function () {
  const portalSchoolID = 'portalSchool';
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users', tenantID: 'schoolA', userID: 'admin1' };
  const _ctxPortal = { ..._ctx, tenantID: portalSchoolID, userID: 'portalAdmin1' };

  const member = {
    id: 'member1',
    name: 'Member One',
    email: 'member.one@testdomain.test',
    status: 'active',
    phoneNumber: '0123',
    schools: [
      { id: 'schoolA', name: 'School A', roles: ['student'] },
      { id: 'schoolB', name: 'School B', roles: ['admin'] },
    ],
  };
  const outsider = { id: 'outsider1', name: 'Outsider', schools: [{ id: 'schoolB', roles: ['admin'] }] };

  let previousPortalSchoolID;

  const stubWrites = () => {
    sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => ({ status: 200, value: true }));
    sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {});
    sinon.stub(UsersRest, 'raiseNotification').callsFake(() => {});
  };
  const notFound = (id) => ({
    status: 404,
    error: { message: `Not found ${id}`, error: new Error(`Not found ${id}`) },
  });

  beforeEach(function () {
    previousPortalSchoolID = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    process.env.SMALL_API_PORTAL_SCHOOL_ID = portalSchoolID;
  });

  afterEach(function () {
    sinon.restore();
    if (previousPortalSchoolID === undefined) {
      delete process.env.SMALL_API_PORTAL_SCHOOL_ID;
    } else {
      process.env.SMALL_API_PORTAL_SCHOOL_ID = previousPortalSchoolID;
    }
  });

  describe('get one', function () {
    it('should get the user itself without a membership check and with all its schools', async () => {
      const stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));

      const res = await UsersService.getOne('admin1', { id: 1, schools: 1 }, _ctx);

      chai.expect(stubBase.callCount).to.equal(1);
      chai.expect(res.status).to.equal(200);
      chai.expect(res.value.schools.map((s) => s.id)).to.deep.equal(['schoolA', 'schoolB']);
    });

    it('should get a member of the current school with only the current school', async () => {
      const stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));

      const res = await UsersService.getOne('member1', null, _ctx);

      chai.expect(stubBase.callCount).to.equal(2); // membership check + get
      chai.expect(res.status).to.equal(200);
      chai.expect(res.value.schools).to.deep.equal([{ id: 'schoolA', name: 'School A', roles: ['student'] }]);
    });

    it('should get a member when the projection has no schools', async () => {
      sinon.stub(DbOpsUtils, 'getOne').callsFake((config, id, projection) => ({
        status: 200,
        value: projection?.name ? { id: 'member1', name: 'Member One' } : _.cloneDeep(member),
      }));

      const res = await UsersService.getOne('member1', { id: 1, name: 1 }, _ctx);

      chai.expect(res).to.deep.equal({ status: 200, value: { id: 'member1', name: 'Member One' } });
    });

    it('should not get a user that is not a member of the current school', async () => {
      const stubBase = sinon
        .stub(DbOpsUtils, 'getOne')
        .callsFake(() => ({ status: 200, value: _.cloneDeep(outsider) }));

      const res = await UsersService.getOne('outsider1', null, _ctx);

      // the real result: it exists, but it is not a member (the controller answers 404)
      chai.expect(stubBase.callCount).to.equal(1); // only the membership check
      chai.expect(res.status).to.equal(403);
      chai.expect(res.error.message).to.equal('The user outsider1 is not a member of the current school');
    });

    it('should answer not found for a user that does not exist', async () => {
      sinon.stub(DbOpsUtils, 'getOne').callsFake(() => notFound('nobody'));

      const res = await UsersService.getOne('nobody', null, _ctx);

      chai.expect(res.status).to.equal(404);
    });

    it('should not get another user without a current school', async () => {
      const stubBase = sinon.stub(DbOpsUtils, 'getOne');

      const res = await UsersService.getOne('member1', null, { ..._ctx, tenantID: undefined });

      chai.expect(stubBase.callCount).to.equal(0);
      chai.expect(res.status).to.equal(403);
    });

    it('should get any user for a portal admin, without the schools and the personal fields', async () => {
      const stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));

      // no projection: the portal projection
      let res = await UsersService.getOne('member1', { _id: 0 }, _ctxPortal);
      chai.expect(stubBase.callCount).to.equal(1); // no membership check
      chai.expect(stubBase.firstCall.args[2]).to.include({ id: 1, name: 1, email: 1, status: 1 });
      chai.expect(stubBase.firstCall.args[2]).to.not.have.any.keys('schools', 'phoneNumber', 'birthday', 'address');
      chai.expect(res.value.schools).to.equal(undefined);

      // a null projection is the portal projection too
      await UsersService.getOne('member1', null, _ctxPortal);
      chai.expect(stubBase.secondCall.args[2]).to.include({ id: 1, email: 1 });

      // a projection is limited to the portal projection
      res = await UsersService.getOne('member1', { id: 1, name: 1, phoneNumber: 1, schools: 1 }, _ctxPortal);
      chai.expect(stubBase.thirdCall.args[2]).to.deep.equal({ _id: 0, id: 1, name: 1 });
    });

    it('should not use the portal access when the portal school is not configured', async () => {
      delete process.env.SMALL_API_PORTAL_SCHOOL_ID;
      sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(outsider) }));

      const res = await UsersService.getOne('outsider1', null, _ctxPortal);

      chai.expect(res.status).to.equal(403);
    });
  });

  describe('put and patch', function () {
    it('should not put or patch a user that is not a member of the current school', async () => {
      sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(outsider) }));
      const stubPut = sinon.stub(DbOpsUtils, 'put');
      const stubPatch = sinon.stub(DbOpsUtils, 'patch');

      let res = await UsersService.put('outsider1', { name: 'Changed' }, _ctx);
      chai.expect(res.status).to.equal(403);
      res = await UsersService.patch('outsider1', { set: { name: 'Changed' } }, _ctx);
      chai.expect(res.status).to.equal(403);

      chai.expect(stubPut.callCount).to.equal(0);
      chai.expect(stubPatch.callCount).to.equal(0);
    });

    it('should put and patch a member of the current school without the other schools', async () => {
      sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
      const stubPut = sinon.stub(DbOpsUtils, 'put').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
      const stubPatch = sinon.stub(DbOpsUtils, 'patch').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
      stubWrites();

      let res = await UsersService.put('member1', { name: 'Changed', phoneNumber: '0123' }, _ctx);
      chai.expect(stubPut.callCount).to.equal(1);
      chai.expect(res.status).to.equal(200);
      chai.expect(JSON.stringify(res.value)).to.not.include('schoolB');

      res = await UsersService.patch('member1', { set: { name: 'Changed' }, unset: ['phoneNumber'] }, _ctx);
      chai.expect(stubPatch.callCount).to.equal(1);
      chai.expect(res.status).to.equal(200);
      chai.expect(JSON.stringify(res.value)).to.not.include('schoolB');
    });

    it('should not put or patch the status through the profile', async () => {
      sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
      const stubPut = sinon.stub(DbOpsUtils, 'put');
      const stubPatch = sinon.stub(DbOpsUtils, 'patch');

      for (const [id, ctx] of [
        ['admin1', _ctx],
        ['member1', _ctx],
        ['member1', _ctxPortal],
      ]) {
        let res = await UsersService.put(id, { status: 'disabled' }, ctx);
        chai.expect(res.status).to.equal(400);
        chai.expect(res.error.message).to.include('"status" is not allowed');

        res = await UsersService.patch(id, { set: { status: 'disabled' } }, ctx);
        chai.expect(res.status).to.equal(400);
      }
      chai.expect(stubPut.callCount).to.equal(0);
      chai.expect(stubPatch.callCount).to.equal(0);
    });

    it('should let a portal admin change only the name of another user', async () => {
      const stubPut = sinon.stub(DbOpsUtils, 'put').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
      const stubPatch = sinon.stub(DbOpsUtils, 'patch').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
      sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
      stubWrites();

      // the name
      let res = await UsersService.put('member1', { name: 'Changed' }, _ctxPortal);
      chai.expect(res.status).to.equal(200);
      chai.expect(res.value.schools).to.equal(undefined);
      res = await UsersService.patch('member1', { set: { name: 'Changed' } }, _ctxPortal);
      chai.expect(res.status).to.equal(200);
      chai.expect(res.value.schools).to.equal(undefined);

      // not the personal fields
      res = await UsersService.put('member1', { phoneNumber: '0123' }, _ctxPortal);
      chai.expect(res.status).to.equal(400);
      res = await UsersService.patch('member1', { unset: ['phoneNumber'] }, _ctxPortal);
      chai.expect(res.status).to.equal(400);

      chai.expect(stubPut.callCount).to.equal(1);
      chai.expect(stubPatch.callCount).to.equal(1);
    });
  });

  describe('get all (portal admins)', function () {
    it('should list the users only for a portal admin, without the schools', async () => {
      const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').callsFake(() => ({ status: 200, value: [] }));
      sinon.stub(DbOpsUtils, 'getAllCount').callsFake(() => ({ status: 200, value: 0 }));

      // not on the portal school
      let res = await UsersService.getAllForReq({ query: {} }, _ctx);
      chai.expect(res.status).to.equal(403);
      chai.expect(stubGetAll.callCount).to.equal(0);

      // portal admin
      res = await UsersService.getAllForReq({ query: { projection: 'id,name,schools,phoneNumber' } }, _ctxPortal);
      chai.expect(res.status).to.equal(200);
      chai.expect(stubGetAll.firstCall.args[1].projection).to.deep.equal({ _id: 0, id: 1, name: 1 });

      // the schools can not be used as a filter
      const stubBuild = sinon.spy(RestApiUtils, 'buildFilterFromReq');
      res = await UsersService.getAllForReq({ query: { 'schools.id': 'schoolA' } }, _ctxPortal);
      chai.expect(stubBuild.firstCall.args[1].filter).to.not.include('schools.id');
      chai.expect(JSON.stringify(stubGetAll.lastCall.args[1].filter || {})).to.not.include('schoolA');
    });
  });

  describe('status (portal admins)', function () {
    for (const [method, fn, body] of [
      ['put', 'putStatus', (status) => ({ status })],
      ['patch', 'patchStatus', (status) => ({ set: { status } })],
    ]) {
      it(`should ${method} the status only on the portal school`, async () => {
        const stubWrite = sinon.stub(DbOpsUtils, method);

        let res = await UsersService[fn]('member1', body('disabled'), _ctx /* schoolA */);
        chai.expect(res.status).to.equal(403);

        delete process.env.SMALL_API_PORTAL_SCHOOL_ID;
        res = await UsersService[fn]('member1', body('disabled'), _ctxPortal);
        chai.expect(res.status).to.equal(403);

        chai.expect(stubWrite.callCount).to.equal(0);
      });

      it(`should ${method} the status active or disabled, never back to pending`, async () => {
        sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
        const stubWrite = sinon.stub(DbOpsUtils, method).callsFake(() => ({ status: 200, value: _.cloneDeep(member) }));
        stubWrites();

        for (const status of ['disabled', 'active']) {
          const res = await UsersService[fn]('member1', body(status), _ctxPortal);
          chai.expect(res.status).to.equal(200);
          chai.expect(res.value.schools).to.equal(undefined); // not the schools of the user
        }

        // never to pending, nothing else than the status
        for (const objInfo of [body('pending'), body('unknown'), { ...body('active'), name: 'x' }, {}]) {
          const res = await UsersService[fn]('member1', objInfo, _ctxPortal);
          chai.expect(res.status).to.equal(400);
        }
        chai.expect(stubWrite.callCount).to.equal(2);
      });

      it(`should not ${method} a portal admin to disable itself`, async () => {
        const stubWrite = sinon.stub(DbOpsUtils, method);

        const res = await UsersService[fn]('portalAdmin1', body('disabled'), _ctxPortal);

        chai.expect(res.status).to.equal(400);
        chai.expect(res.error.message).to.equal('Skipping disabling status of current user');
        chai.expect(stubWrite.callCount).to.equal(0);
      });
    }
  });

  describe('delete school admin (portal admins)', function () {
    const admin = { id: 'admin2', schools: [{ id: 'schoolA', roles: ['admin', 'professor'] }] };

    it('should delete a school admin only on the portal school', async () => {
      const stubPatch = sinon.stub(DbOpsUtils, 'patch');

      let res = await UsersService.deleteSchoolAdmin('schoolA', 'admin2', _ctx /* schoolA */);
      chai.expect(res.status).to.equal(403);

      delete process.env.SMALL_API_PORTAL_SCHOOL_ID;
      res = await UsersService.deleteSchoolAdmin('schoolA', 'admin2', _ctxPortal);
      chai.expect(res.status).to.equal(403);

      chai.expect(stubPatch.callCount).to.equal(0);
    });

    it('should remove only the admin role of that school', async () => {
      sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(admin) }));
      const stubPatch = sinon.stub(DbOpsUtils, 'patch').callsFake(() => ({
        status: 200,
        value: { ...admin, schools: [{ id: 'schoolA', roles: ['professor'] }] },
      }));
      stubWrites();

      const res = await UsersService.deleteSchoolAdmin('schoolA', 'admin2', _ctxPortal);

      chai.expect(res.status).to.equal(200);
      chai.expect(res.value.schools).to.equal(undefined); // a portal admin does not see the schools of the user
      chai.expect(stubPatch.firstCall.args[2]).to.deep.equal({
        remove: { schools: [{ id: 'schoolA', roles: ['admin'] }] },
      });
    });

    it('should delete the last admin of a school too (a portal admin can invite a new one)', async () => {
      sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: _.cloneDeep(admin) }));
      const stubCount = sinon.stub(DbOpsUtils, 'getAllCount');
      const stubPatch = sinon.stub(DbOpsUtils, 'patch').callsFake(() => ({
        status: 200,
        value: { id: 'admin2', schools: [{ id: 'schoolA', roles: ['professor'] }] },
      }));
      stubWrites();

      const res = await UsersService.deleteSchoolAdmin('schoolA', 'admin2', _ctxPortal);

      chai.expect(res.status).to.equal(200);
      chai.expect(stubCount.callCount).to.equal(0); // the admins are not counted
      chai.expect(stubPatch.callCount).to.equal(1);
    });

    it('should answer not found for a user that is not an admin of the school', async () => {
      const stubGet = sinon.stub(DbOpsUtils, 'getOne');
      const stubPatch = sinon.stub(DbOpsUtils, 'patch');

      // not an admin there (another role, another school, no schools), or no such user
      for (const value of [
        { id: 'admin2', schools: [{ id: 'schoolA', roles: ['professor'] }] },
        { id: 'admin2', schools: [{ id: 'schoolB', roles: ['admin'] }] },
        { id: 'admin2' },
      ]) {
        stubGet.callsFake(() => ({ status: 200, value }));
        const res = await UsersService.deleteSchoolAdmin('schoolA', 'admin2', _ctxPortal);
        chai.expect(res.status).to.equal(404);
      }
      stubGet.callsFake(() => notFound('admin2'));
      const res = await UsersService.deleteSchoolAdmin('schoolA', 'admin2', _ctxPortal);
      chai.expect(res.status).to.equal(404);

      chai.expect(stubPatch.callCount).to.equal(0);
    });
  });

  describe('activate (internal, at login)', function () {
    it('should activate a pending user', async () => {
      sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: { ...member, status: 'pending' } }));
      const stubPut = sinon.stub(DbOpsUtils, 'put').callsFake(() => ({ status: 200, value: { ...member } }));
      stubWrites();

      const res = await UsersService.activate('member1', _ctx);

      chai.expect(res.status).to.equal(200);
      chai.expect(res.value.status).to.equal('active');
      chai.expect(stubPut.firstCall.args[2]).to.include({ status: 'active' });
      chai.expect(EventsRest.raiseEventForObject.firstCall.args[1]).to.equal('activate');
    });

    it('should not change a user that is not pending (a disabled user stays disabled)', async () => {
      const stubGet = sinon.stub(DbOpsUtils, 'getOne');
      const stubPut = sinon.stub(DbOpsUtils, 'put');

      for (const status of ['disabled', 'active']) {
        stubGet.callsFake(() => ({ status: 200, value: { ...member, status } }));
        const res = await UsersService.activate('member1', _ctx);
        chai.expect(res.status).to.equal(200);
        chai.expect(res.value.status).to.equal(status);
        chai.expect(res.value.schools).to.equal(undefined);
      }
      chai.expect(stubPut.callCount).to.equal(0);
    });

    it('should not activate a user that does not exist', async () => {
      sinon.stub(DbOpsUtils, 'getOne').callsFake(() => notFound('nobody'));
      const stubPut = sinon.stub(DbOpsUtils, 'put');

      const res = await UsersService.activate('nobody', _ctx);

      chai.expect(res.status).to.equal(404);
      chai.expect(stubPut.callCount).to.equal(0);
    });
  });
});
