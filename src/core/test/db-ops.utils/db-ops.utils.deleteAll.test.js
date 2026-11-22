const chai = require('chai');
const sinon = require('sinon');

const DbOpsUtils = require('../../utils/db-ops.utils.js');

/**
 * delete all the objects of a filter
 */
describe('DB-Ops Utils deleteAll', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  const config = { serviceName: 'service' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * the objects of the filter are deleted, the answer is their count
   */
  it('should deleteAll with success', async () => {
    // stub: two objects deleted
    const collection = { deleteMany: sinon.stub().resolves({ deletedCount: 2 }) };

    // call
    const res = await DbOpsUtils.deleteAll({ ...config, collection }, { filter: { userID: 'user1' } }, _ctx);

    // check: the filter is used as it is
    chai.expect(collection.deleteMany.firstCall.args[0]).to.deep.equal({ userID: 'user1' });
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value).to.equal(2);
  }).timeout(10000);

  /**
   * without a filter nothing is deleted (it would empty the collection)
   */
  it('should deleteAll refuse a missing or an empty filter', async () => {
    // stub: no delete is expected
    const collection = { deleteMany: sinon.stub() };

    // a missing filter, an empty filter: refused
    for (const filter of [undefined, {}, { filter: {} }]) {
      const res = await DbOpsUtils.deleteAll({ ...config, collection }, filter, _ctx);
      chai.expect(res.status).to.equal(400);
      chai.expect(res.error.message).to.equal('Delete all requires a filter');
    }

    // check: nothing was deleted
    chai.expect(collection.deleteMany.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * a database error is a server error
   */
  it('should deleteAll fail with an exception', async () => {
    // stub: the database fails
    const collection = { deleteMany: sinon.stub().rejects(new Error('Test error message')) };

    // call
    const res = await DbOpsUtils.deleteAll({ ...config, collection }, { filter: { userID: 'user1' } }, _ctx);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message).to.equal('Test error message');
  }).timeout(10000);
});
