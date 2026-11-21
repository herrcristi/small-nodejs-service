const chai = require('chai');
const sinon = require('sinon');

const DbOpsUtils = require('../../utils/db-ops.utils.js');

/**
 * the copies updated by updateManyReferences and updateManyReferencesID are tested with the database (npm run testdb,
 * functional.database.test.js); here only a database that fails
 */
describe('DB-Ops Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * updateManyReferences exception
   */
  it('should updateManyReferences exception', async () => {
    // stub: the database fails
    const collection = { find: sinon.stub().throws(new Error('Test exception')) };
    const config = { serviceName: 'service', collection };
    const ref = { fieldName: 'schools[]' };
    const objInfo = { id: 'id1', name: 'name' };

    // call
    const res = await DbOpsUtils.updateManyReferences(config, ref, objInfo, _ctx);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message).to.include('Test exception');
  }).timeout(10000);

  /**
   * updateManyReferencesID exception
   */
  it('should updateManyReferencesID exception', async () => {
    // stub: the database fails
    const collection = { find: sinon.stub().throws(new Error('Test exception')) };
    const config = { serviceName: 'service', collection };

    // call
    const res = await DbOpsUtils.updateManyReferencesID(config, { fieldName: 'students[]' }, 'old1', 'user1', _ctx);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message).to.include('Test exception');
  }).timeout(10000);
});
