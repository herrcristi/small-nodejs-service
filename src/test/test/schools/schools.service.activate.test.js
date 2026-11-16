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

  it('should activate a pending school', async () => {
    sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: { id: 'school1', status: 'pending' } }));
    sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => ({ status: 200, value: true }));
    sinon.stub(EventsRest, 'raiseEventForObject');
    sinon.stub(SchoolsRest, 'raiseNotification');
    const stubPut = sinon
      .stub(DbOpsUtils, 'put')
      .callsFake(() => ({ status: 200, value: { id: 'school1', status: 'active' } }));

    const res = await SchoolsService.activate('school1', _ctx);

    chai.expect(res.value.status).to.equal('active');
    chai.expect(stubPut.firstCall.args[1]).to.equal('school1');
    chai.expect(stubPut.firstCall.args[2]).to.include({ status: 'active' });
    chai.expect(SchoolsRest.raiseNotification.callCount).to.equal(1);
  });

  it('should not change a school that is not pending (a disabled school stays disabled)', async () => {
    const stubGet = sinon.stub(DbOpsUtils, 'getOne');
    const stubPut = sinon.stub(DbOpsUtils, 'put');

    for (const status of ['disabled', 'active']) {
      stubGet.callsFake(() => ({ status: 200, value: { id: 'school1', name: 'School 1', status } }));
      const res = await SchoolsService.activate('school1', _ctx);
      chai.expect(res).to.deep.equal({ status: 200, value: { id: 'school1', name: 'School 1', status } });
    }
    chai.expect(stubPut.callCount).to.equal(0);
  });

  it('should not activate a school that does not exist', async () => {
    sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 404, error: { message: 'Not found x' } }));
    const stubPut = sinon.stub(DbOpsUtils, 'put');

    const res = await SchoolsService.activate('x', _ctx);

    chai.expect(res.status).to.equal(404);
    chai.expect(stubPut.callCount).to.equal(0);
  });
});
