const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DBMgr = require('../../../core/utils/database-manager.utils.js');
const DBOpsUtils = require('../../../core/utils/db-ops.utils.js');
const DBOpsArrayUtils = require('../../../core/utils/db-ops.array.utils.js');

const TestConstants = require('../../test-constants.js');

const TestsUtils = require('../../tests.utils.js');

describe('Database Functional', function () {
  let _ctx = { reqID: 'Test-Database', lang: 'en' };
  let database = null;

  before(async function () {
    database = await DBMgr.connect(process.env.DATABASE_URL, process.env.DATABASE_DB, _ctx);
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
