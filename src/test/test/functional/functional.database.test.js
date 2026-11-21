const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');

const DBMgr = require('../../../core/utils/database-manager.utils.js');
const DBOpsUtils = require('../../../core/utils/db-ops.utils.js');
const DBOpsArrayUtils = require('../../../core/utils/db-ops.array.utils.js');

const TestConstants = require('../../test-constants.js');

const TestsUtils = require('../../tests.utils.js');

describe('Database Functional', function () {
  let _ctx = { reqID: 'Test-Database', lang: 'en' };
  let database = null;

  before(async function () {
    database = await DBMgr.connect(process.env.SMALL_API_DATABASE_URL, process.env.SMALL_API_DATABASE_DB, _ctx);
  });

  beforeEach(async function () {
    await database.collection('dbtests').deleteMany();
  });

  afterEach(async function () {
    sinon.restore();
    await database.collection('dbtests').deleteMany();
  });

  after(async function () {});

  /**
   * operations post & get
   */
  it('should operations post & get', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      schools: ['s1', 's2', 's3', 's4'],
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        name: 'name',
        schools: ['s1', 's2', 's3', 's4'],
        id: res.value.id,
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 1,
        _id: res.value._id,
      },
      time: res.time,
    });

    // check with get one
    let objID = res.value.id;
    let resGetOne = await DBOpsUtils.getOne(config, objID, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(resGetOne, null, 2)}\n`);
    chai.expect(resGetOne).to.deep.equal({
      status: 200,
      value: {
        name: 'name',
        schools: ['s1', 's2', 's3', 's4'],
        id: res.value.id,
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 1,
      },
      time: resGetOne.time,
    });

    // check with get all
    let resGetAll = await DBOpsUtils.getAll(config, { filter: {}, projection: { _id: 0 } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(resGetAll, null, 2)}\n`);
    chai.expect(resGetAll).to.deep.equal({
      status: 200,
      value: [
        {
          name: 'name',
          schools: ['s1', 's2', 's3', 's4'],
          id: res.value.id,
          createdTimestamp: res.value.createdTimestamp,
          lastModifiedTimestamp: res.value.lastModifiedTimestamp,
          modifiedCount: 1,
        },
      ],
      time: resGetAll.time,
    });

    // check with get all by ids
    let resGetAllByIDs = await DBOpsUtils.getAllByIDs(config, [objID], { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(resGetAllByIDs, null, 2)}\n`);
    chai.expect(resGetAllByIDs).to.deep.equal({
      status: 200,
      value: [
        {
          name: 'name',
          schools: ['s1', 's2', 's3', 's4'],
          id: res.value.id,
          createdTimestamp: res.value.createdTimestamp,
          lastModifiedTimestamp: res.value.lastModifiedTimestamp,
          modifiedCount: 1,
        },
      ],
      time: resGetAllByIDs.time,
    });

    // check with get all count
    let resGetCount = await DBOpsUtils.getAllCount(config, { filter: {}, projection: { _id: 0 } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(resGetCount, null, 2)}\n`);
    chai.expect(resGetCount).to.deep.equal({
      status: 200,
      value: 1,
      time: resGetCount.time,
    });
  }).timeout(10000);

  /**
   * operations delete
   */
  it('should operations delete', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      schools: ['s1', 's2', 's3', 's4'],
    };

    // initial
    let resGetCount = await DBOpsUtils.getAllCount(config, { filter: {}, projection: { _id: 0 } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(resGetCount, null, 2)}\n`);
    chai.expect(resGetCount).to.deep.equal({
      status: 200,
      value: 0,
      time: resGetCount.time,
    });

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        name: 'name',
        schools: ['s1', 's2', 's3', 's4'],
        id: res.value.id,
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 1,
        _id: res.value._id,
      },
      time: res.time,
    });

    // check with get all count
    resGetCount = await DBOpsUtils.getAllCount(config, { filter: {}, projection: { _id: 0 } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(resGetCount, null, 2)}\n`);
    chai.expect(resGetCount).to.deep.equal({
      status: 200,
      value: 1,
      time: resGetCount.time,
    });

    // delete
    let objID = res.value.id;
    res = await DBOpsUtils.delete(config, objID, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        name: 'name',
        schools: ['s1', 's2', 's3', 's4'],
        id: res.value.id,
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 1,
      },
      time: res.time,
    });

    // check with get all count
    resGetCount = await DBOpsUtils.getAllCount(config, { filter: {}, projection: { _id: 0 } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(resGetCount, null, 2)}\n`);
    chai.expect(resGetCount).to.deep.equal({
      status: 200,
      value: 0,
      time: resGetCount.time,
    });
  }).timeout(10000);

  /**
   * operations put
   */
  it('should operations put', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      schools: ['s1', 's2', 's3', 's4'],
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 201,
      value: {
        name: 'name',
        schools: ['s1', 's2', 's3', 's4'],
        id: res.value.id,
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 1,
        _id: res.value._id,
      },
      time: res.time,
    });

    // put
    let objID = res.value.id;
    let putInfo = {
      key: 'value',
    };
    res = await DBOpsUtils.put(config, objID, putInfo, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: res.value.id,
        name: 'name',
        schools: ['s1', 's2', 's3', 's4'],
        key: 'value',
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 2,
      },
      time: res.time,
    });
  }).timeout(10000);

  /**
   * operations patch set & unset
   */
  it('should operations patch set & unset', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      schools: ['s1', 's2', 's3', 's4'],
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // patch
    let objID = res.value.id;
    let patchInfo = {
      set: {
        key: 'value',
      },
      unset: ['schools'],
    };
    res = await DBOpsUtils.patch(config, objID, patchInfo, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: res.value.id,
        name: 'name',
        key: 'value',
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 2,
      },
      time: res.time,
    });
  }).timeout(10000);

  /**
   * operations patch remove simple array
   */
  it('should operations patch remove simple array', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      schools: ['s1', 's2', 's3', 's4'],
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // patch
    let objID = res.value.id;
    let patchInfo = {
      remove: {
        schools: ['s1', 's3'],
      },
    };
    res = await DBOpsUtils.patch(config, objID, patchInfo, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: res.value.id,
        name: 'name',
        schools: ['s2', 's4'],
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 2,
      },
      time: res.time,
    });
  }).timeout(10000);

  /**
   * operations patch remove array of objects
   */
  it('should operations patch remove array of objects', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      schools: [
        {
          id: 's1',
          name: 's1',
          roles: ['role1', 'role2'],
        },
        {
          id: 's2',
          name: 's2',
          roles: ['role1', 'role2'],
        },
        {
          id: 's3',
          name: 's3',
          roles: ['role1', 'role2'],
        },
        {
          id: 's4',
          name: 's4',
          roles: ['role1', 'role2'],
        },
      ],
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // patch
    let objID = res.value.id;
    let patchInfo = {
      remove: {
        schools: [
          {
            id: 's1',
          },
          {
            id: 's2',
            name: 'name2', // this will be ignored because id exists
          },
          {
            name: 's3', // this will be taken into consideration
          },
        ],
      },
    };
    res = await DBOpsUtils.patch(config, objID, patchInfo, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: res.value.id,
        name: 'name',
        schools: [
          {
            id: 's4',
            name: 's4',
            roles: ['role1', 'role2'],
          },
        ],
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 2,
      },
      time: res.time,
    });
  }).timeout(10000);

  /**
   * operations patch remove nested array
   */
  it('should operations patch remove nested array', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      schools: [
        {
          id: 's1',
          name: 's1',
          roles: ['role1', 'role2'],
        },
        {
          id: 's2',
          name: 's2',
          roles: ['role1', 'role2', 'role3'],
        },
        {
          id: 's3',
          name: 's3',
        },
        {
          id: 'schooldid4',
          name: 'name4',
          roles: ['role1', 'role2', 'role3', 'role4'],
          principals: [
            {
              id: 'principal1',
              name: 'principal1',
            },
          ],
          building: [
            {
              id: 'b1',
              tags: ['t1', 't2', 't3'],
            },
            {
              id: 'b2',
              tags: ['t1'],
            },
          ],
          classes: [
            {
              id: 'c1',
              tags: ['c1', 'c2', 'c3'],
            },
            {
              id: 'c2',
              tags: ['c1', 'c2'],
            },
          ],
        },
      ],
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // patch
    let objID = res.value.id;
    let patchInfo = {
      remove: {
        schools: [
          {
            id: 's2',
            roles: ['role1', 'role2'],
          },
          {
            id: 'schooldid4',
            name: 'name4', // this will be ignored because id exists
            roles: ['role3', 'role4'],
            principals: [
              {
                name: 'principal1',
              },
            ],
            building: [
              {
                id: 'b1',
                tags: ['t1', 't2'],
              },
              {
                id: 'b2',
              },
            ],
            classes: [
              {
                tags: ['c1', 'c2'],
              },
            ],
          },
        ],
      },
    };
    res = await DBOpsUtils.patch(config, objID, patchInfo, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: res.value.id,
        name: 'name',
        schools: [
          {
            id: 's1',
            name: 's1',
            roles: ['role1', 'role2'],
          },
          {
            id: 's2',
            name: 's2',
            roles: ['role3'],
          },
          {
            id: 's3',
            name: 's3',
          },
          {
            id: 'schooldid4',
            name: 'name4',
            roles: ['role1', 'role2'],
            principals: [],
            building: [
              {
                id: 'b1',
                tags: ['t3'],
              },
            ],
            classes: [
              {
                id: 'c1',
                tags: ['c3'],
              },
              {
                id: 'c2',
                tags: [],
              },
            ],
          },
        ],
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 2,
      },
      time: res.time,
    });
  }).timeout(10000);

  /**
   * operations patch add simple array
   */
  it('should operations patch add simple array', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      schools: ['s1', 's2'],
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // patch
    let objID = res.value.id;
    let patchInfo = {
      add: {
        schools: ['s3', 's4'],
      },
    };
    res = await DBOpsUtils.patch(config, objID, patchInfo, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: res.value.id,
        name: 'name',
        schools: ['s1', 's2', 's3', 's4'],
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 2,
      },
      time: res.time,
    });
  }).timeout(10000);

  /**
   * operations patch add array of objects
   */
  it('should operations patch add array of objects', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      schools: [
        {
          id: 's1',
          name: 's1',
        },
      ],
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // patch
    let objID = res.value.id;
    let patchInfo = {
      add: {
        schools: [
          {
            id: 's1',
            name: 'name1',
          },
          {
            id: 's2',
            name: 'name2',
          },
        ],
      },
    };
    res = await DBOpsUtils.patch(config, objID, patchInfo, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: res.value.id,
        name: 'name',
        schools: [
          {
            id: 's1',
            name: 'name1',
          },
          {
            id: 's2',
            name: 'name2',
          },
        ],
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 2,
      },
      time: res.time,
    });
  }).timeout(10000);

  /**
   * operations patch add nested arrays
   */
  it('should operations patch add nested arrays', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      schools: [
        {
          id: 's1',
          name: 's1',
          roles: ['role1'],
        },
        {
          id: 'schoolid4',
          name: 's4',
          principals: [
            {
              name: 'principal1',
            },
          ],
        },
      ],
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // patch
    let objID = res.value.id;
    let patchInfo = {
      add: {
        schools: [
          {
            id: 's1',
            name: 'name1',
            roles: ['role2', 'role3'],
          },
          {
            id: 'schoolid4',
            name: 'name4',
            principals: [
              {
                name: 'principal2',
              },
            ],
          },
        ],
      },
    };
    res = await DBOpsUtils.patch(config, objID, patchInfo, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: res.value.id,
        name: 'name',
        schools: [
          {
            id: 's1',
            name: 'name1',
            roles: ['role1', 'role2', 'role3'],
          },
          {
            id: 'schoolid4',
            name: 'name4',
            principals: [
              {
                name: 'principal1',
              },
              {
                name: 'principal2',
              },
            ],
          },
        ],
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 2,
      },
      time: res.time,
    });
  }).timeout(10000);

  /**
   * operations updateManyReferences array
   */
  it('should updateManyReferences array', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      schools: [
        {
          id: 's1',
          name: 's1',
        },
        {
          id: 's2',
          name: 's2',
        },
      ],
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // patch
    let objID = res.value.id;
    let refInfo = {
      id: 's1',
      name: 'name1',
    };
    res = await DBOpsUtils.updateManyReferences(config, { fieldName: 'schools[]' }, refInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    res = await DBOpsUtils.getOne(config, objID, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: res.value.id,
        name: 'name',
        schools: [
          {
            id: 's1',
            name: 'name1',
          },
          {
            id: 's2',
            name: 's2',
          },
        ],
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 2,
      },
      time: res.time,
    });
  }).timeout(10000);

  /**
   * operations updateManyReferences non-array
   */
  it('should updateManyReferences non-array', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      school: {
        id: 's1',
        name: 's1',
      },
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // patch
    let objID = res.value.id;
    let refInfo = {
      id: 's1',
      name: 'name1',
    };
    res = await DBOpsUtils.updateManyReferences(config, { fieldName: 'school' }, refInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    res = await DBOpsUtils.getOne(config, objID, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: res.value.id,
        name: 'name',
        school: {
          id: 's1',
          name: 'name1',
        },
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 2,
      },
      time: res.time,
    });
  }).timeout(10000);

  /**
   * updateManyReferences of a single copy with a modifiedCount and a createdTimestamp: only the older copies are
   * updated (the same object with a smaller or missing modifiedCount, or an object with the same id created again)
   */
  it('should updateManyReferences only the older copies of a single copy', async () => {
    // the objects with copies of the user U1 (created on 2026-11-01, now at its 5th change)
    const config = { serviceName: 'ServiceTest', collection: database.collection('dbtests') };
    const created = '2026-11-01T10:00:00.000Z';
    await database.collection('dbtests').insertMany([
      { id: 'O1', user: { id: 'U1', name: 'Old Name', createdTimestamp: created, modifiedCount: 3 } },
      { id: 'O2', user: { id: 'U1', name: 'Same Name', createdTimestamp: created, modifiedCount: 5 } },
      { id: 'O3', user: { id: 'U1', name: 'Newer Name', createdTimestamp: created, modifiedCount: 7 } },
      {
        id: 'O4',
        user: { id: 'U1', name: 'Earlier Account', createdTimestamp: '2026-01-01T10:00:00.000Z', modifiedCount: 9 },
      },
      { id: 'O5', user: { id: 'U1', name: 'No Count' } },
      { id: 'O6', user: { id: 'U2', name: 'Other User', createdTimestamp: created, modifiedCount: 1 } },
    ]);

    // update the copies of U1
    const objInfo = { id: 'U1', name: 'John Smith', createdTimestamp: created, modifiedCount: 5 };
    const res = await DBOpsUtils.updateManyReferences(config, { fieldName: 'user' }, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the older copy, the copy of the earlier account and the copy without a count
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value).to.equal(3);
    chai.expect(res.ids.sort()).to.deep.equal(['O1', 'O4', 'O5']);

    // check the stored copies
    const objects = await database
      .collection('dbtests')
      .find({})
      .project({ _id: 0, id: 1, user: 1 })
      .sort({ id: 1 })
      .toArray();
    chai.expect(objects).to.deep.equal([
      { id: 'O1', user: { id: 'U1', name: 'John Smith', createdTimestamp: created, modifiedCount: 5 } },
      { id: 'O2', user: { id: 'U1', name: 'Same Name', createdTimestamp: created, modifiedCount: 5 } },
      { id: 'O3', user: { id: 'U1', name: 'Newer Name', createdTimestamp: created, modifiedCount: 7 } },
      { id: 'O4', user: { id: 'U1', name: 'John Smith', createdTimestamp: created, modifiedCount: 5 } },
      { id: 'O5', user: { id: 'U1', name: 'John Smith', createdTimestamp: created, modifiedCount: 5 } },
      { id: 'O6', user: { id: 'U2', name: 'Other User', createdTimestamp: created, modifiedCount: 1 } },
    ]);
  }).timeout(10000);

  /**
   * updateManyReferences of copies in an array with a modifiedCount: only the older copies are updated, the other
   * copies of the same array are not changed
   */
  it('should updateManyReferences only the older copies in an array', async () => {
    // the objects with copies of the school S1 (at its 4th change) next to the copies of S2
    const config = { serviceName: 'ServiceTest', collection: database.collection('dbtests') };
    const created = '2026-11-01T10:00:00.000Z';
    await database.collection('dbtests').insertMany([
      {
        id: 'O1',
        schools: [
          { id: 'S1', name: 'Old School', createdTimestamp: created, modifiedCount: 2 },
          { id: 'S2', name: 'Other School', createdTimestamp: created, modifiedCount: 1 },
        ],
      },
      { id: 'O2', schools: [{ id: 'S1', name: 'Newer School', createdTimestamp: created, modifiedCount: 6 }] },
    ]);

    // update the copies of S1
    const objInfo = { id: 'S1', name: 'Central School', createdTimestamp: created, modifiedCount: 4 };
    const res = await DBOpsUtils.updateManyReferences(config, { fieldName: 'schools[]' }, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: only O1 has an older copy
    chai.expect(res.status).to.equal(200);
    chai.expect(res.ids).to.deep.equal(['O1']);

    // check the stored copies
    const objects = await database
      .collection('dbtests')
      .find({})
      .project({ _id: 0, id: 1, schools: 1 })
      .sort({ id: 1 })
      .toArray();
    chai.expect(objects).to.deep.equal([
      {
        id: 'O1',
        schools: [
          { id: 'S1', name: 'Central School', createdTimestamp: created, modifiedCount: 4 },
          { id: 'S2', name: 'Other School', createdTimestamp: created, modifiedCount: 1 },
        ],
      },
      { id: 'O2', schools: [{ id: 'S1', name: 'Newer School', createdTimestamp: created, modifiedCount: 6 }] },
    ]);
  }).timeout(10000);

  /**
   * updateManyReferences of copies inside the elements of an array (schedules[].location) with a modifiedCount: only
   * the older copies are updated, also when an element of the same array has a newer copy
   */
  it('should updateManyReferences only the older copies inside an array', async () => {
    // an object with two schedules: the first one has an older copy of the location L1, the second one a newer copy
    const config = { serviceName: 'ServiceTest', collection: database.collection('dbtests') };
    const created = '2026-11-01T10:00:00.000Z';
    await database.collection('dbtests').insertOne({
      id: 'O1',
      schedules: [
        { id: 'SC1', location: { id: 'L1', name: 'Old Room', createdTimestamp: created, modifiedCount: 1 } },
        { id: 'SC2', location: { id: 'L1', name: 'Newer Room', createdTimestamp: created, modifiedCount: 6 } },
      ],
    });

    // update the copies of L1
    const objInfo = { id: 'L1', name: 'Main Room', createdTimestamp: created, modifiedCount: 3 };
    const res = await DBOpsUtils.updateManyReferences(config, { fieldName: 'schedules[].location' }, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.ids).to.deep.equal(['O1']);

    // check the stored copies: only the older one changed
    const object = await database.collection('dbtests').findOne({ id: 'O1' }, { projection: { _id: 0, schedules: 1 } });
    chai.expect(object).to.deep.equal({
      schedules: [
        { id: 'SC1', location: { id: 'L1', name: 'Main Room', createdTimestamp: created, modifiedCount: 3 } },
        { id: 'SC2', location: { id: 'L1', name: 'Newer Room', createdTimestamp: created, modifiedCount: 6 } },
      ],
    });
  }).timeout(10000);

  /**
   * updateManyReferences when no copy is older (a change that comes back through a cycle of notifications): nothing is
   * updated
   */
  it('should updateManyReferences nothing when no copy is older', async () => {
    // an object with the same version of the copy
    const config = { serviceName: 'ServiceTest', collection: database.collection('dbtests') };
    const created = '2026-11-01T10:00:00.000Z';
    await database.collection('dbtests').insertOne({
      id: 'O1',
      modifiedCount: 1,
      user: { id: 'U1', name: 'John Smith', createdTimestamp: created, modifiedCount: 5 },
    });

    // update with the same version
    const objInfo = { id: 'U1', name: 'John Smith', createdTimestamp: created, modifiedCount: 5 };
    const res = await DBOpsUtils.updateManyReferences(config, { fieldName: 'user' }, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: nothing updated, the object is not changed (its modifiedCount too)
    chai.expect(res.value).to.equal(0);
    chai.expect(res.ids).to.deep.equal([]);
    const object = await database.collection('dbtests').findOne({ id: 'O1' }, { projection: { _id: 0 } });
    chai.expect(object).to.deep.equal({
      id: 'O1',
      modifiedCount: 1,
      user: { id: 'U1', name: 'John Smith', createdTimestamp: created, modifiedCount: 5 },
    });
  }).timeout(10000);

  /**
   * updateManyReferencesID: the copies of an object that got another id take its new id (in an array and inside the
   * elements of an array); the other copies and the other fields are not changed
   */
  it('should updateManyReferencesID the copies with the previous id', async () => {
    // a group with the copy of the student old1 next to another one, a schedule with old1 in a schedule of a class
    const config = { serviceName: 'ServiceTest', collection: database.collection('dbtests') };
    await database.collection('dbtests').insertMany([
      {
        id: 'G1',
        students: [
          { id: 'old1', name: 'Jane Smith' },
          { id: 'user2', name: 'John Brown' },
        ],
      },
      { id: 'G2', students: [{ id: 'user2', name: 'John Brown' }] },
    ]);

    // call
    const res = await DBOpsUtils.updateManyReferencesID(config, { fieldName: 'students[]' }, 'old1', 'user1', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: only the copy of old1
    chai.expect(res.status).to.equal(200);
    chai.expect(res.ids).to.deep.equal(['G1']);
    const objects = await database
      .collection('dbtests')
      .find({})
      .project({ _id: 0, id: 1, students: 1 })
      .sort({ id: 1 })
      .toArray();
    chai.expect(objects).to.deep.equal([
      {
        id: 'G1',
        students: [
          { id: 'user1', name: 'Jane Smith' },
          { id: 'user2', name: 'John Brown' },
        ],
      },
      { id: 'G2', students: [{ id: 'user2', name: 'John Brown' }] },
    ]);

    // case: no copy with the previous id: nothing changed
    const resNone = await DBOpsUtils.updateManyReferencesID(config, { fieldName: 'students[]' }, 'old1', 'user1', _ctx);
    chai.expect(resNone.value).to.equal(0);
    chai.expect(resNone.ids).to.deep.equal([]);
  }).timeout(10000);

  /**
   * operations deleteManyReferences array
   */
  it('should deleteManyReferences array', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      schools: [
        {
          id: 's1',
          name: 's1',
        },
        {
          id: 's2',
          name: 's2',
        },
      ],
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // patch
    let objID = res.value.id;
    let refInfo = {
      id: 's1',
      name: 'name1',
    };
    res = await DBOpsUtils.deleteManyReferences(config, { fieldName: 'schools[]' }, refInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    res = await DBOpsUtils.getOne(config, objID, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: res.value.id,
        name: 'name',
        schools: [
          {
            id: 's2',
            name: 's2',
          },
        ],
        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 2,
      },
      time: res.time,
    });
  }).timeout(10000);

  /**
   * operations deleteManyReferences non-array
   */
  it('should deleteManyReferences non-array', async () => {
    let config = {
      serviceName: 'ServiceTest',
      collection: database.collection('dbtests'),
    };

    let objInfo = {
      name: 'name',
      school: {
        id: 's1',
        name: 's1',
      },
    };

    // post
    let res = await DBOpsUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // patch
    let objID = res.value.id;
    let refInfo = {
      id: 's1',
      name: 'name1',
    };
    res = await DBOpsUtils.deleteManyReferences(config, { fieldName: 'school' }, refInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    res = await DBOpsUtils.getOne(config, objID, { _id: 0 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: res.value.id,
        name: 'name',
        school: {
          id: 's1',
        },

        createdTimestamp: res.value.createdTimestamp,
        lastModifiedTimestamp: res.value.lastModifiedTimestamp,
        modifiedCount: 2,
      },
      time: res.time,
    });
  }).timeout(10000);
});
