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
   * updateManyReferences of a single referenced object with a modifiedCount and a createdTimestamp: only the older
   * referenced objects are updated (the same object with a smaller or missing modifiedCount, or an object with the same
   * id created again)
   */
  it('should updateManyReferences only the older objects of a single reference', async () => {
    // the objects that reference the user U1 (created on 2026-11-01, now at its 5th change)
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

    // update the referenced U1
    const objInfo = { id: 'U1', name: 'John Smith', createdTimestamp: created, modifiedCount: 5 };
    const res = await DBOpsUtils.updateManyReferences(config, { fieldName: 'user' }, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the older referenced user, the one of the earlier account and the one without a count
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value).to.equal(3);
    chai.expect(res.ids.sort()).to.deep.equal(['O1', 'O4', 'O5']);

    // check the stored referenced objects
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
   * updateManyReferences of the referenced objects in an array with a modifiedCount: only the older ones are updated,
   * the other referenced objects of the same array are not changed
   */
  it('should updateManyReferences only the older objects in an array', async () => {
    // the objects that reference the school S1 (at its 4th change) next to S2
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

    // update the referenced S1
    const objInfo = { id: 'S1', name: 'Central School', createdTimestamp: created, modifiedCount: 4 };
    const res = await DBOpsUtils.updateManyReferences(config, { fieldName: 'schools[]' }, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: only O1 references an older S1
    chai.expect(res.status).to.equal(200);
    chai.expect(res.ids).to.deep.equal(['O1']);

    // check the stored referenced objects
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
   * updateManyReferences of the referenced objects inside the elements of an array (schedules[].location) with a
   * modifiedCount: only the older ones are updated, also when an element of the same array references a newer one
   */
  it('should updateManyReferences only the older objects inside an array', async () => {
    // an object with two schedules: the first one references an older location L1, the second one a newer L1
    const config = { serviceName: 'ServiceTest', collection: database.collection('dbtests') };
    const created = '2026-11-01T10:00:00.000Z';
    await database.collection('dbtests').insertOne({
      id: 'O1',
      schedules: [
        { id: 'SC1', location: { id: 'L1', name: 'Old Room', createdTimestamp: created, modifiedCount: 1 } },
        { id: 'SC2', location: { id: 'L1', name: 'Newer Room', createdTimestamp: created, modifiedCount: 6 } },
      ],
    });

    // update the referenced L1
    const objInfo = { id: 'L1', name: 'Main Room', createdTimestamp: created, modifiedCount: 3 };
    const res = await DBOpsUtils.updateManyReferences(config, { fieldName: 'schedules[].location' }, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.ids).to.deep.equal(['O1']);

    // check the stored referenced objects: only the older one changed
    const object = await database.collection('dbtests').findOne({ id: 'O1' }, { projection: { _id: 0, schedules: 1 } });
    chai.expect(object).to.deep.equal({
      schedules: [
        { id: 'SC1', location: { id: 'L1', name: 'Main Room', createdTimestamp: created, modifiedCount: 3 } },
        { id: 'SC2', location: { id: 'L1', name: 'Newer Room', createdTimestamp: created, modifiedCount: 6 } },
      ],
    });
  }).timeout(10000);

  /**
   * updateManyReferences when no referenced object is older (a change that comes back through a cycle of
   * notifications): nothing is updated
   */
  it('should updateManyReferences nothing when no referenced object is older', async () => {
    // an object that references the same version
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
   * updateManyReferences checks the version again in its write: a newer referenced object written by another request
   * after the objects to update were read is not overwritten (the older notification changes only the referenced
   * objects still older)
   */
  it('should updateManyReferences not overwrite a newer object written after the read', async () => {
    // two objects that reference an older user U1
    const collection = database.collection('dbtests');
    const created = '2026-11-01T10:00:00.000Z';
    await collection.insertMany([
      { id: 'O1', user: { id: 'U1', name: 'Old Name', createdTimestamp: created, modifiedCount: 3 } },
      { id: 'O2', user: { id: 'U1', name: 'Old Name', createdTimestamp: created, modifiedCount: 3 } },
    ]);

    // the collection: another request writes a newer U1 in O1 between the read of the objects and the write
    const findOptions = [];
    const concurrentCollection = new Proxy(collection, {
      get: (target, prop) => {
        if (prop === 'find') {
          return (filter, options) => {
            findOptions.push(options);
            return target.find(filter, options);
          };
        }
        if (prop === 'updateMany') {
          return async (...args) => {
            await target.updateOne({ id: 'O1' }, { $set: { 'user.name': 'Newer Name', 'user.modifiedCount': 7 } });
            return target.updateMany(...args);
          };
        }
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const config = { serviceName: 'ServiceTest', collection: concurrentCollection, maxTimeMS: 30000 };

    // call: the notification of the 5th change of U1
    const objInfo = { id: 'U1', name: 'John Smith', createdTimestamp: created, modifiedCount: 5 };
    const res = await DBOpsUtils.updateManyReferences(config, { fieldName: 'user' }, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the objects were read on the primary (the objects written just before in the same request are seen)
    chai.expect(findOptions).to.deep.equal([{ readPreference: 'primary', maxTimeMS: 30000 }]);

    // check: only O2 was written, the newer U1 of O1 is kept
    chai.expect(res.value).to.equal(1);
    const objects = await collection.find({}).project({ _id: 0, id: 1, user: 1 }).sort({ id: 1 }).toArray();
    chai.expect(objects).to.deep.equal([
      { id: 'O1', user: { id: 'U1', name: 'Newer Name', createdTimestamp: created, modifiedCount: 7 } },
      { id: 'O2', user: { id: 'U1', name: 'John Smith', createdTimestamp: created, modifiedCount: 5 } },
    ]);
  }).timeout(10000);

  /**
   * the reads that must see the writes just done ask the primary (the options { readPreference:
   * Constants.ReadPrimary }); the others give no options, the read preference of the client (a secondary may answer);
   * the answer of a conditional write that matched nothing is read on the primary too
   */
  it('should read on the primary the objects just written', async () => {
    // an object that references the user U1
    const collection = database.collection('dbtests');
    await collection.insertOne({ id: 'O1', name: 'Jane Smith', status: 'active', user: { id: 'U1' } });

    // the collection: the options of the reads are kept
    const readOptions = [];
    const recordingCollection = new Proxy(collection, {
      get: (target, prop) => {
        if (['find', 'findOne', 'countDocuments'].includes(prop)) {
          return (filter, options) => {
            readOptions.push({ [prop]: options });
            return target[prop](filter, options);
          };
        }
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const maxTimeMS = 30000; // the time limit of each call
    const config = { serviceName: 'ServiceTest', collection: recordingCollection, maxTimeMS };
    const projection = { _id: 0, id: 1, name: 1 };
    const readPrimary = { readPreference: DBOpsUtils.Constants.ReadPrimary };

    // call: the reads with and without the primary
    const resOne = await DBOpsUtils.getOne(config, 'O1', projection, _ctx, readPrimary);
    const resIDs = await DBOpsUtils.getAllByIDs(config, ['O1'], projection, _ctx, readPrimary);
    const resRef = await DBOpsUtils.getAllByReference(
      config,
      { fieldName: 'user' },
      'U1',
      projection,
      _ctx,
      readPrimary
    );
    const resCount = await DBOpsUtils.getAllCount(config, { filter: { id: 'O1' } }, _ctx, readPrimary);
    const resAny = await DBOpsUtils.getOne(config, 'O1', projection, _ctx);

    // check: the same object, read where asked
    for (const res of [resOne, resAny]) {
      chai.expect(res.value).to.deep.equal({ id: 'O1', name: 'Jane Smith' });
    }
    for (const res of [resIDs, resRef]) {
      chai.expect(res.value).to.deep.equal([{ id: 'O1', name: 'Jane Smith' }]);
    }
    chai.expect(resCount.value).to.equal(1);
    chai
      .expect(readOptions)
      .to.deep.equal([
        { findOne: { projection, readPreference: 'primary', maxTimeMS } },
        { find: { readPreference: 'primary', maxTimeMS } },
        { find: { readPreference: 'primary', maxTimeMS } },
        { countDocuments: { readPreference: 'primary', maxTimeMS } },
        { findOne: { projection, maxTimeMS } },
      ]);

    // call: a conditional write that matches nothing
    readOptions.length = 0;
    const resPut = await DBOpsUtils.put(config, 'O1', { status: 'active' }, projection, _ctx, {
      filter: { status: 'pending' },
    });

    // check: 409, decided on the primary
    chai.expect(resPut.status).to.equal(409);
    chai.expect(readOptions).to.deep.equal([{ countDocuments: { limit: 1, readPreference: 'primary', maxTimeMS } }]);
  }).timeout(10000);

  /**
   * every database call carries the time limit of its config (maxTimeMS, the timeout of SMALL_API_DATABASE_LIMITS):
   * the reads, the writes and the updates of the referenced objects
   */
  it('should give every database call its time limit', async () => {
    // an object that references the user U1 and a list of schools
    const collection = database.collection('dbtests');
    await collection.insertOne({ id: 'O1', name: 'Jane Smith', user: { id: 'U1', name: 'John Smith' }, schools: [] });

    // the collection: the options of each call are kept
    const callOptions = [];
    const calls = [
      'find',
      'findOne',
      'countDocuments',
      'insertOne',
      'findOneAndUpdate',
      'findOneAndDelete',
      'updateMany',
      'deleteMany',
      'bulkWrite',
    ];
    const recordingCollection = new Proxy(collection, {
      get: (target, prop) => {
        if (calls.includes(prop)) {
          return (first, ...rest) => {
            const options = rest.at(-1);
            callOptions.push({ call: prop, maxTimeMS: options?.maxTimeMS });
            return target[prop](first, ...rest);
          };
        }
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const config = { serviceName: 'ServiceTest', collection: recordingCollection, maxTimeMS: 10000 };
    const projection = { _id: 0 };
    const school = { id: 'S1', name: 'North School' };

    // call: a time limit of 10 seconds
    await DBOpsUtils.getAll(config, { filter: {}, projection }, _ctx);
    await DBOpsUtils.getAllCount(config, { filter: {} }, _ctx);
    await DBOpsUtils.getOne(config, 'O1', projection, _ctx);
    await DBOpsUtils.post(config, { id: 'O2', name: 'Mary Jones' }, _ctx);
    await DBOpsUtils.put(config, 'O2', { name: 'Mary Brown' }, projection, _ctx, { filter: { name: 'Mary Jones' } });
    await DBOpsUtils.put(config, 'O2', { name: 'Mary Green' }, projection, _ctx, { filter: { name: 'Mary Jones' } });
    await DBOpsUtils.patch(config, 'O1', { set: { name: 'Jane Brown' } }, projection, _ctx);
    await DBOpsUtils.addManyReferences(config, ['O1'], { fieldName: 'schools[]' }, school, _ctx);
    await DBOpsUtils.addManyReferences(config, ['O1'], { fieldName: 'user' }, { id: 'U1', name: 'John Brown' }, _ctx);
    await DBOpsUtils.updateManyReferences(config, { fieldName: 'user' }, { id: 'U1', name: 'John Green' }, _ctx);
    await DBOpsUtils.updateManyReferencesID(config, { fieldName: 'user' }, 'U1', 'U2', _ctx);
    await DBOpsUtils.deleteManyReferences(config, { fieldName: 'schools[]' }, school, _ctx);
    await DBOpsUtils.deleteManyReferences(config, { fieldName: 'user' }, { id: 'U2', name: 'John Green' }, _ctx);
    await DBOpsUtils.delete(config, 'O2', projection, _ctx);
    await DBOpsUtils.deleteAll(config, { filter: { id: 'O1' } }, _ctx);

    // check: every call, with the time limit
    chai.expect(callOptions.map((item) => item.call)).to.deep.equal([
      'find', // getAll
      'countDocuments', // getAllCount
      'findOne', // getOne
      'insertOne', // post
      'findOneAndUpdate', // put
      'findOneAndUpdate', // put that matches nothing
      'countDocuments', // its answer: 409
      'bulkWrite', // patch
      'findOneAndUpdate',
      'updateMany', // addManyReferences, array
      'updateMany', // addManyReferences, single reference
      'find', // updateManyReferences
      'updateMany',
      'find', // updateManyReferencesID
      'updateMany',
      'updateMany', // deleteManyReferences, array
      'updateMany', // deleteManyReferences, single reference
      'findOneAndDelete', // delete
      'deleteMany', // deleteAll
    ]);
    for (const item of callOptions) {
      chai.expect(item.maxTimeMS, item.call).to.equal(10000);
    }
  }).timeout(10000);

  /**
   * a database call that runs longer than its time limit is stopped by the database: 503 (the request can be sent
   * again later), without the text of the database
   */
  it('should answer 503 when a database call runs longer than its time limit', async () => {
    // an object, read by a slow query (1.2 seconds for each object)
    const collection = database.collection('dbtests');
    await collection.insertOne({ id: 'O1', name: 'Jane Smith' });
    const config = { serviceName: 'ServiceTest', collection, maxTimeMS: 1000 };
    const slowFilter = { $where: 'sleep(1200) || true' };

    // call: a time limit of 1 second
    const resRead = await DBOpsUtils.getAll(config, { filter: slowFilter, projection: { _id: 0 } }, _ctx);
    const resWrite = await DBOpsUtils.deleteAll(config, { filter: slowFilter }, _ctx);

    // check: stopped, 503, the object is kept
    for (const res of [resRead, resWrite]) {
      chai.expect(res.status).to.equal(503);
      chai.expect(res.error.message).to.equal('The database call ran longer than its time limit');
    }
    const count = await collection.countDocuments({ id: 'O1' });
    chai.expect(count).to.equal(1);
  }).timeout(10000);

  /**
   * updateManyReferencesID: where an object that got another id is referenced, it takes its new id (in an array and
   * inside the elements of an array); the other referenced objects and the other fields are not changed
   */
  it('should updateManyReferencesID the references with the previous id', async () => {
    // a group that references the student old1 next to another one, a schedule with old1 in a schedule of a class
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

    // check: only the referenced old1
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

    // case: no reference with the previous id: nothing changed
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
