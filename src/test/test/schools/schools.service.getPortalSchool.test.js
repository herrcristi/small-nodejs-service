const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const TestConstants = require('../../test-constants.js');
const SchoolsService = require('../../../services/schools/schools.service.js');

describe('Schools Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Schools' };

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * getPortalSchool with success for the portal tenant
   */
  it('should getPortalSchool with success', async () => {
    const portalSchool = { id: TestConstants.PortalSchoolID, name: 'Portal School', status: 'active' };
    const stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      chai.expect(objID).to.equal(TestConstants.PortalSchoolID);
      return { status: 200, value: portalSchool };
    });

    const res = await SchoolsService.getPortalSchool({ ..._ctx, tenantID: TestConstants.PortalSchoolID });

    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({ status: 200, value: portalSchool });
  }).timeout(10000);

  /**
   * getPortalSchool is denied for any other tenant
   */
  it('should getPortalSchool fail for another tenant', async () => {
    const stubBase = sinon.stub(DbOpsUtils, 'getOne');

    const res = await SchoolsService.getPortalSchool({ ..._ctx, tenantID: 'another-school' });

    chai.expect(stubBase.callCount).to.equal(0);
    chai.expect(res.status).to.equal(403);
    chai.expect(res.error.message).to.equal('Portal school access required');
  }).timeout(10000);

  /**
   * getPortalSchool is denied when the portal school is not configured
   */
  it('should getPortalSchool fail when the portal school is not configured', async () => {
    sinon.stub(process, 'env').value({ ...process.env, SMALL_API_PORTAL_SCHOOL_ID: '' });
    const stubBase = sinon.stub(DbOpsUtils, 'getOne');

    const res = await SchoolsService.getPortalSchool({ ..._ctx, tenantID: '' });

    chai.expect(stubBase.callCount).to.equal(0);
    chai.expect(res.status).to.equal(403);
  }).timeout(10000);
});
