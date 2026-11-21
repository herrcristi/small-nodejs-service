const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const SchoolsService = require('../../../services/schools/schools.service.js');

/**
 * activate (internal): a pending school becomes active, the decision is taken on the school document
 */
describe('Schools Service activate', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Schools' };

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * a pending school becomes active
   */
  it('should activate a pending school', async () => {
    // stub: the references, the events, the notifications and the write (the school is still pending)
    sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => ({ status: 200, value: true }));
    sinon.stub(EventsRest, 'raiseEventForObject');
    sinon.stub(SchoolsRest, 'raiseNotification');
    const stubPut = sinon
      .stub(DbOpsUtils, 'put')
      .callsFake(() => ({ status: 200, value: { id: 'school1', status: 'active' } }));

    // call
    const res = await SchoolsService.activate('school1', _ctx);

    // check: written as active only if still pending (one conditional write), notified
    chai.expect(res.value.status).to.equal('active');
    chai.expect(stubPut.firstCall.args[1]).to.equal('school1');
    chai.expect(stubPut.firstCall.args[2]).to.include({ status: 'active' });
    chai.expect(stubPut.firstCall.args[5]).to.deep.equal({ filter: { status: 'pending' } });
    chai.expect(SchoolsRest.raiseNotification.callCount).to.equal(1);
  });

  /**
   * a school that is not pending is not changed (a disabled school stays disabled)
   */
  it('should not change a school that is not pending (a disabled school stays disabled)', async () => {
    // stub: the conditional write matches nothing (409: not pending, for example disabled meanwhile); the reads
    // change in the loop; no notification is expected
    sinon.stub(ReferencesUtils, 'populateReferences').resolves({ status: 200, value: true });
    sinon.stub(DbOpsUtils, 'put').resolves({ status: 409, error: { message: 'Not changed school1' } });
    const stubGet = sinon.stub(DbOpsUtils, 'getOne');
    const stubNotify = sinon.stub(SchoolsRest, 'raiseNotification');

    // a disabled and an active school: answered as they are
    for (const status of ['disabled', 'active']) {
      stubGet.callsFake(() => ({ status: 200, value: { id: 'school1', name: 'School 1', status } }));
      const res = await SchoolsService.activate('school1', _ctx);
      chai.expect(res).to.deep.equal({ status: 200, value: { id: 'school1', name: 'School 1', status } });
    }

    // check: nothing was changed (no notification)
    chai.expect(stubNotify.callCount).to.equal(0);
  });

  /**
   * a school that does not exist is not activated
   */
  it('should not activate a school that does not exist', async () => {
    // stub: no stored school (the write matches nothing: 404)
    sinon.stub(ReferencesUtils, 'populateReferences').resolves({ status: 200, value: true });
    sinon.stub(DbOpsUtils, 'put').resolves({ status: 404, error: { message: 'Not found x' } });
    const stubGet = sinon.stub(DbOpsUtils, 'getOne');

    // call
    const res = await SchoolsService.activate('x', _ctx);

    // check: 404, no read after it
    chai.expect(res.status).to.equal(404);
    chai.expect(stubGet.callCount).to.equal(0);
  });
});
