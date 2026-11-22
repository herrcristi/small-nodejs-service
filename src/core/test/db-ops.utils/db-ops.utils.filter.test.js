const chai = require('chai');
const sinon = require('sinon');

const DbOpsUtils = require('../../utils/db-ops.utils.js');
const DbOpsArrayUtils = require('../../utils/db-ops.array.utils.js');

describe('DB-Ops Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  const config = { serviceName: 'service' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * put with an extra filter: the filter is part of the one database call
   */
  it('should put with an extra filter in the same database call', async () => {
    // stub: the database changes the school (it is still pending)
    const collection = { findOneAndUpdate: sinon.stub().resolves({ value: { id: 'S1', status: 'active' } }) };

    // call: activate only a pending school
    const options = { filter: { status: 'pending' } };
    const res = await DbOpsUtils.put({ ...config, collection }, 'S1', { status: 'active' }, {}, _ctx, options);

    // check: one call, filtered by the id and the status
    chai.expect(collection.findOneAndUpdate.args[0][0]).to.deep.equal({ status: 'pending', id: 'S1' });
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value).to.deep.equal({ id: 'S1', status: 'active' });
  }).timeout(10000);

  /**
   * put with an extra filter that is not matched: 409 when the object exists, 404 otherwise
   */
  it('should answer 409 when the object does not match the extra filter, 404 when it does not exist', async () => {
    const options = { filter: { status: 'pending' } };
    const collection = {
      findOneAndUpdate: sinon.stub().resolves({ lastErrorObject: { n: 0 } }),
      countDocuments: sinon.stub(),
    };

    // case: the school exists (it was disabled meanwhile): nothing changed, 409
    collection.countDocuments.resolves(1);
    const resChanged = await DbOpsUtils.put({ ...config, collection }, 'S1', { status: 'active' }, {}, _ctx, options);
    chai.expect(resChanged.status).to.equal(409);
    chai.expect(collection.countDocuments.args[0][0]).to.deep.equal({ id: 'S1' });

    // case: the school does not exist: 404
    collection.countDocuments.resolves(0);
    const resMissing = await DbOpsUtils.put({ ...config, collection }, 'S1', { status: 'active' }, {}, _ctx, options);
    chai.expect(resMissing.status).to.equal(404);

    // case: without an extra filter a write that matched nothing is a 404, without a second call
    collection.countDocuments.resetHistory();
    const resPlain = await DbOpsUtils.put({ ...config, collection }, 'S1', { status: 'active' }, {}, _ctx);
    chai.expect(resPlain.status).to.equal(404);
    chai.expect(collection.countDocuments.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * patch removeWhere: the elements that match a condition are removed, after the other removals
   */
  it('should patch removeWhere after the removals', async () => {
    // stub: the role removal (from the array utils) and the database
    sinon.stub(DbOpsArrayUtils, 'getPushBulkOpsFromArray').returns([]);
    const pullOp = {
      updateMany: { filter: { id: 'U1' }, update: { $pull: { 'schools.$[schools].roles': 'student' } } },
    };
    sinon.stub(DbOpsArrayUtils, 'getPullBulkOpsFromArray').returns([pullOp]);
    const collection = {
      bulkWrite: sinon.stub().resolves({ matchedCount: 1 }),
      findOneAndUpdate: sinon.stub().resolves({ value: { id: 'U1', schools: [] } }),
    };

    // call: remove the role, then the memberships without roles
    const patchInfo = {
      remove: { schools: [{ id: 'A', roles: ['student'] }] },
      removeWhere: { schools: { roles: { $size: 0 } } },
    };
    const res = await DbOpsUtils.patch({ ...config, collection }, 'U1', patchInfo, {}, _ctx);

    // check: the role first, then the empty memberships, in one ordered bulk write
    const ops = collection.bulkWrite.args[0][0];
    chai.expect(ops).to.have.length(2);
    chai.expect(ops[0]).to.deep.equal(pullOp);
    chai.expect(ops[1]).to.deep.equal({
      updateOne: { filter: { id: 'U1' }, update: { $pull: { schools: { roles: { $size: 0 } } } } },
    });
    chai.expect(res.status).to.equal(200);
  }).timeout(10000);

  /**
   * deleteManyReferences with an extra filter: only the other objects
   */
  it('should delete the references only from the objects that match the extra filter', async () => {
    // stub: the database
    const collection = { updateMany: sinon.stub().resolves({ modifiedCount: 1 }) };

    // call: remove group G1 from the students that are not S1, S3
    const options = { filter: { id: { $nin: ['S1', 'S3'] } } };
    const res = await DbOpsUtils.deleteManyReferences(
      { ...config, collection },
      { fieldName: 'groups[]' },
      { id: 'G1', name: 'Group 1' },
      _ctx,
      options
    );

    // check: the extra filter with the reference
    chai.expect(collection.updateMany.args[0][0]).to.deep.equal({ id: { $nin: ['S1', 'S3'] }, 'groups.id': 'G1' });
    chai.expect(res).to.deep.include({ status: 200, value: 1 });
  }).timeout(10000);

  /**
   * getAllByReference: the objects that have a copy of an object
   */
  it('should get all the objects that have a reference of an object', async () => {
    // stub: the database (a cursor)
    const cursor = { toArray: sinon.stub().resolves([{ id: 'S1' }]) };
    ['project', 'sort', 'skip', 'limit'].forEach((fn) => (cursor[fn] = () => cursor));
    const collection = { find: sinon.stub().returns(cursor) };

    // call: the students with the user U1 (a single reference) and the groups with the student S1 (an array)
    const res = await DbOpsUtils.getAllByReference({ ...config, collection }, { fieldName: 'user' }, 'U1', {}, _ctx);
    await DbOpsUtils.getAllByReference({ ...config, collection }, { fieldName: 'students[]' }, 'S1', {}, _ctx);

    // check: the filters, and the objects
    chai.expect(collection.find.args[0][0]).to.deep.equal({ 'user.id': 'U1' });
    chai.expect(collection.find.args[1][0]).to.deep.equal({ 'students.id': 'S1' });
    chai.expect(res.value).to.deep.equal([{ id: 'S1' }]);
  }).timeout(10000);
});
