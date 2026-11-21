const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const EventsDatabase = require('../../../services/events/events.database.js');
const EventsService = require('../../../services/events/events.service.js');

/**
 * the global events (no school: logins, password resets, ...) are read only by portal admins
 */
describe('Events Service global', function () {
  const portalSchoolID = 'portalSchool';
  const _ctx = { reqID: 'testReq', lang: 'en', tenantID: 'schoolA' };
  const _ctxPortal = { ..._ctx, tenantID: portalSchoolID };
  let previous;

  before(async function () {});

  beforeEach(function () {
    previous = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    process.env.SMALL_API_PORTAL_SCHOOL_ID = portalSchoolID;
  });

  afterEach(function () {
    sinon.restore();
    if (previous === undefined) {
      delete process.env.SMALL_API_PORTAL_SCHOOL_ID;
    } else {
      process.env.SMALL_API_PORTAL_SCHOOL_ID = previous;
    }
  });

  after(async function () {});

  /**
   * the global events list: only on the portal school, read from the collection without a tenant
   */
  it('should get the global events only for a portal admin, from the global collection', async () => {
    // stub: the collection and the reads
    const stubCollection = sinon.stub(EventsDatabase, 'collection').resolves(null);
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').returns({ status: 200, value: [{ id: 'event1' }] });
    sinon.stub(DbOpsUtils, 'getAllCount').returns({ status: 200, value: 1 });

    // not on the portal school
    let res = await EventsService.getAllGlobalForReq({ query: {} }, _ctx);
    chai.expect(res.status).to.equal(403);
    chai.expect(stubGetAll.callCount).to.equal(0);

    // the portal admin: the collection without a tenant
    res = await EventsService.getAllGlobalForReq({ query: {} }, _ctxPortal);
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.data).to.deep.equal([{ id: 'event1' }]);
    chai.expect(stubCollection.firstCall.args[0].tenantID).to.equal(undefined);

    // the context of the request is not changed
    chai.expect(_ctxPortal.tenantID).to.equal(portalSchoolID);
  });

  /**
   * one global event: only on the portal school
   */
  it('should get one global event only for a portal admin', async () => {
    // stub: the collection and the read
    const stubCollection = sinon.stub(EventsDatabase, 'collection').resolves(null);
    const stubGetOne = sinon.stub(DbOpsUtils, 'getOne').returns({ status: 200, value: { id: 'event1' } });

    // not on the portal school
    let res = await EventsService.getOneGlobal('event1', null, _ctx);
    chai.expect(res.status).to.equal(403);
    chai.expect(stubGetOne.callCount).to.equal(0);

    // the portal admin: the collection without a tenant
    res = await EventsService.getOneGlobal('event1', null, _ctxPortal);
    chai.expect(res).to.deep.equal({ status: 200, value: { id: 'event1' } });
    chai.expect(stubCollection.firstCall.args[0].tenantID).to.equal(undefined);

    // no portal school configured
    delete process.env.SMALL_API_PORTAL_SCHOOL_ID;
    res = await EventsService.getOneGlobal('event1', null, _ctxPortal);
    chai.expect(res.status).to.equal(403);
  });
});
