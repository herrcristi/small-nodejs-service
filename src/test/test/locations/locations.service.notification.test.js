const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const LocationsService = require('../../../services/locations/locations.service.js');

describe('Locations Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Locations', tenantID: 'school1' };

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * the locations keep no copy of other services: a notification changes nothing
   */
  it('should do notification with success', async () => {
    // stub: no change is expected
    const stubPut = sinon.stub(DbOpsUtils, 'updateManyReferences');

    // call
    const notification = { serviceName: 'schedules', modified: [{ id: 'schedule1', name: 'Mathematics Monday' }] };
    const res = await LocationsService.notification(notification, _ctx);

    // check: ignored
    chai.expect(res).to.deep.equal({ status: 200, value: false });
    chai.expect(stubPut.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * notification failed tenant
   */
  it('should notification failed tenant', async () => {
    // call: without a school
    const notification = { serviceName: 'schedules', modified: [{ id: 'schedule1' }] };
    const res = await LocationsService.notification(notification, { ..._ctx, tenantID: undefined });

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * notification fail validation
   */
  it('should notification fail validation', async () => {
    // call: no service name
    const res = await LocationsService.notification({ modified: [{ id: 'schedule1' }] }, _ctx);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "serviceName" is required');
  }).timeout(10000);
});
