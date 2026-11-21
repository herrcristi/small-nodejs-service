const chai = require('chai');
const sinon = require('sinon');

const DbOpsUtils = require('../../utils/db-ops.utils.js');

describe('DB-Ops Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  const config = {
    serviceName: 'service',
  };

  /**
   * a collection: find returns the objects with an older copy, updateMany returns its result
   */
  const getCollection = (objects, updateResult) => {
    const toArray = sinon.stub().resolves(objects);
    const project = sinon.stub().returns({ toArray });
    return {
      find: sinon.stub().returns({ project }),
      updateMany: sinon.stub().resolves(updateResult),
    };
  };

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * updateManyReferences of a copy in an array, without a modifiedCount: every copy is updated
   */
  it('should updateManyReferences with success array', async () => {
    // stub: two schools have the copy
    const collection = getCollection([{ id: 'S1' }, { id: 'S2' }], { modifiedCount: 2 });
    const ref = { fieldName: 'schools[]' };
    const objInfo = { id: 'id1', name: 'name' };

    // call
    const res = await DbOpsUtils.updateManyReferences({ ...config, collection }, ref, objInfo, _ctx);
    delete res.time;

    // check: found by the copy, updated by the ids
    chai.expect(collection.find.args[0][0]).to.deep.equal({ 'schools.id': 'id1' });
    const [filter, op, options] = collection.updateMany.args[0];
    chai.expect(filter).to.deep.equal({ id: { $in: ['S1', 'S2'] } });
    chai.expect(op).to.deep.equal({
      $set: {
        'schools.$[schools].id': 'id1',
        'schools.$[schools].name': 'name',
        lastModifiedTimestamp: op.$set.lastModifiedTimestamp,
      },
      $inc: { modifiedCount: 1 },
    });
    chai.expect(options).to.deep.equal({ arrayFilters: [{ 'schools.id': 'id1' }] });
    chai.expect(res).to.deep.equal({ status: 200, value: 2, ids: ['S1', 'S2'] });
  }).timeout(10000);

  /**
   * updateManyReferences of a single copy with a modifiedCount: only the older copies
   */
  it('should updateManyReferences with success non array, only the older copies', async () => {
    // stub: one student has an older copy of the user
    const collection = getCollection([{ id: 'U1' }], { modifiedCount: 1 });
    const ref = { fieldName: 'user' };
    const objInfo = { id: 'id1', name: 'name', modifiedCount: 5 };

    // call
    const res = await DbOpsUtils.updateManyReferences({ ...config, collection }, ref, objInfo, _ctx);
    delete res.time;

    // check: the copies with a smaller (or no) modifiedCount
    const older = { $not: { $gte: 5 } };
    chai.expect(collection.find.args[0][0]).to.deep.equal({ 'user.id': 'id1', 'user.modifiedCount': older });
    const [filter, op, options] = collection.updateMany.args[0];
    chai.expect(filter).to.deep.equal({ id: { $in: ['U1'] } });
    chai.expect(op.$set).to.deep.equal({
      'user.id': 'id1',
      'user.name': 'name',
      'user.modifiedCount': 5,
      lastModifiedTimestamp: op.$set.lastModifiedTimestamp,
    });
    chai.expect(options).to.deep.equal({ arrayFilters: [] });
    chai.expect(res).to.deep.equal({ status: 200, value: 1, ids: ['U1'] });
  }).timeout(10000);

  /**
   * updateManyReferences with a createdTimestamp: the older copies of the same object, and the copies of an object with
   * the same id that was created again (another createdTimestamp)
   */
  it('should updateManyReferences the older copies and the copies of an object created again', async () => {
    // stub: a student has an older copy of the user, another one a copy of the account before it was created again
    const collection = getCollection([{ id: 'U1' }, { id: 'U2' }], { modifiedCount: 2 });
    const created = '2026-11-21T10:00:00.000Z';
    const objInfo = { id: 'id1', name: 'name', createdTimestamp: created, modifiedCount: 5 };

    // call: a single copy, and a copy in an array
    const res = await DbOpsUtils.updateManyReferences({ ...config, collection }, { fieldName: 'user' }, objInfo, _ctx);
    await DbOpsUtils.updateManyReferences({ ...config, collection }, { fieldName: 'schools[]' }, objInfo, _ctx);
    delete res.time;

    // check: the same object with an older count, or another createdTimestamp
    const older = { $not: { $gte: 5 } };
    chai.expect(collection.find.args[0][0]).to.deep.equal({
      'user.id': 'id1',
      $or: [
        { 'user.createdTimestamp': created, 'user.modifiedCount': older },
        { 'user.createdTimestamp': { $ne: created } },
      ],
    });
    chai.expect(res).to.deep.equal({ status: 200, value: 2, ids: ['U1', 'U2'] });

    // check: in an array, the same condition on the element, and in the array filter of the update
    chai.expect(collection.find.args[1][0]).to.deep.equal({
      schools: {
        $elemMatch: {
          id: 'id1',
          $or: [{ createdTimestamp: created, modifiedCount: older }, { createdTimestamp: { $ne: created } }],
        },
      },
    });
    chai.expect(collection.updateMany.args[1][2]).to.deep.equal({
      arrayFilters: [
        {
          'schools.id': 'id1',
          $or: [
            { 'schools.createdTimestamp': created, 'schools.modifiedCount': older },
            { 'schools.createdTimestamp': { $ne: created } },
          ],
        },
      ],
    });
  }).timeout(10000);

  /**
   * updateManyReferences of a copy in an array of an array, with a modifiedCount
   */
  it('should updateManyReferences with success array with array', async () => {
    // stub
    const collection = getCollection([{ id: 'S1' }], { modifiedCount: 1 });
    const ref = { fieldName: 'schools[].locations[]' };
    const objInfo = { id: 'id1', name: 'name', modifiedCount: 2 };

    // call
    const res = await DbOpsUtils.updateManyReferences({ ...config, collection }, ref, objInfo, _ctx);
    delete res.time;

    // check: an element of an element, the array filters also only for the older copies
    const older = { $not: { $gte: 2 } };
    chai.expect(collection.find.args[0][0]).to.deep.equal({
      schools: { $elemMatch: { locations: { $elemMatch: { id: 'id1', modifiedCount: older } } } },
    });
    const [, op, options] = collection.updateMany.args[0];
    chai.expect(op.$set['schools.$[schools].locations.$[locations].name']).to.equal('name');
    chai.expect(options).to.deep.equal({
      arrayFilters: [
        { 'schools.locations.id': 'id1', 'schools.locations.modifiedCount': older },
        { 'locations.id': 'id1', 'locations.modifiedCount': older },
      ],
    });
    chai.expect(res).to.deep.equal({ status: 200, value: 1, ids: ['S1'] });
  }).timeout(10000);

  /**
   * updateManyReferences of a single copy in an array, with a modifiedCount
   */
  it('should updateManyReferences with success array with non-array', async () => {
    // stub
    const collection = getCollection([{ id: 'S1' }], { modifiedCount: 1 });
    const ref = { fieldName: 'schools[].location' };
    const objInfo = { id: 'id1', name: 'name', modifiedCount: 3 };

    // call
    const res = await DbOpsUtils.updateManyReferences({ ...config, collection }, ref, objInfo, _ctx);
    delete res.time;

    // check
    const older = { $not: { $gte: 3 } };
    chai.expect(collection.find.args[0][0]).to.deep.equal({
      schools: { $elemMatch: { 'location.id': 'id1', 'location.modifiedCount': older } },
    });
    const [, op, options] = collection.updateMany.args[0];
    chai.expect(op.$set['schools.$[schools].location.name']).to.equal('name');
    chai.expect(options).to.deep.equal({
      arrayFilters: [{ 'schools.location.id': 'id1', 'schools.location.modifiedCount': older }],
    });
    chai.expect(res).to.deep.equal({ status: 200, value: 1, ids: ['S1'] });
  }).timeout(10000);

  /**
   * updateManyReferences without an older copy (a cycle, or a late notification): nothing is updated
   */
  it('should updateManyReferences nothing when no copy is older', async () => {
    // stub: no copy is older
    const collection = getCollection([], { modifiedCount: 0 });
    const ref = { fieldName: 'user' };
    const objInfo = { id: 'id1', name: 'name', modifiedCount: 5 };

    // call
    const res = await DbOpsUtils.updateManyReferences({ ...config, collection }, ref, objInfo, _ctx);
    delete res.time;

    // check: no update
    chai.expect(collection.updateMany.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({ status: 200, value: 0, ids: [] });
  }).timeout(10000);

  /**
   * updateManyReferences exception
   */
  it('should updateManyReferences exception', async () => {
    // stub: the database fails
    const collection = { find: sinon.stub().throws(new Error('Test exception')) };
    const ref = { fieldName: 'schools[]' };
    const objInfo = { id: 'id1', name: 'name' };

    // call
    const res = await DbOpsUtils.updateManyReferences({ ...config, collection }, ref, objInfo, _ctx);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message).to.include('Test exception');
  }).timeout(10000);
});
