const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const SchoolsService = require('../../../services/schools/schools.service.js');

describe('Schools Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Schools', tenantID: 'school1' };

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * the schools keep no copy of other services: a notification changes nothing
   */
  it('should do notification with success', async () => {
    // stub: no change is expected
    const stubPut = sinon.stub(DbOpsUtils, 'updateManyReferences');

    // call
    const notification = { serviceName: 'users', modified: [{ id: 'user1', name: 'Ana Pop' }] };
    const res = await SchoolsService.notification(notification, _ctx);

    // check: ignored
    chai.expect(res).to.deep.equal({ status: 200, value: false });
    chai.expect(stubPut.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * notification fail validation
   */
  it('should notification fail validation', async () => {
    // call: no service name
    const res = await SchoolsService.notification({ modified: [{ id: 'user1' }] }, _ctx);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "serviceName" is required');
  }).timeout(10000);
});
