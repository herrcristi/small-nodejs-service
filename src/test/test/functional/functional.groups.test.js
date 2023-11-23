const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');

const GroupsDatabase = require('../../../services/groups/groups.database.js');
const UsersDatabase = require('../../../services/users/users.database.js');
const EventsDatabase = require('../../../services/events/events.database.js');

const GroupsConstants = require('../../../services/groups/groups.constants.js');
const TestsUtils = require('../../tests.utils.js');

describe('Groups Functional', function () {
  let _ctx = { reqID: 'Test-Groups', tenantID: TestConstants.Schools[0].id, lang: 'en' };

  before(async function () {});

  beforeEach(async function () {
    await TestsUtils.initDatabase(_ctx);
  });

  afterEach(async function () {
    sinon.restore();
    await TestsUtils.cleanupDatabase(_ctx);
  });

  after(async function () {});

  /**
   * getAll with success
   */
  it('should getAll with success', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${GroupsConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({
      data: [...testGroups],
      meta: {
        count: testGroups.length,
        limit: 0,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${GroupsConstants.ApiPath}/${testGroup.id}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({
      ...testGroup,
    });
  }).timeout(10000);

  /**
   * post fail duplicate name
   */
  it('should post fail duplicate name', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = _.cloneDeep(testGroups[0]);

    delete testGroup.id;
    delete testGroup.type;
    delete testGroup._lang_en;

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${GroupsConstants.ApiPath}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testGroup });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai
      .expect(res.body.error)
      .to.include(`E11000 duplicate key error collection: Small-Test.groups_${_ctx.tenantID} index: name_1 dup key`);
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = _.cloneDeep(testGroups[0]);

    testGroup.name = 'new name';
    delete testGroup.id;
    delete testGroup.type;
    delete testGroup._lang_en;

    // check events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${GroupsConstants.ApiPath}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testGroup });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(res.body.id).to.exist;
    chai.expect(res.body.type).to.equal(testGroups[0].type);
    chai.expect(res.body.status).to.equal(GroupsConstants.Status.Active);
    chai.expect(res.body.createdTimestamp).to.exist;
    chai.expect(res.body.lastModifiedTimestamp).to.exist;

    // after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // do a get
    testGroup.id = res.body.id;
    res = await chai
      .request(TestConstants.WebServer)
      .get(`${GroupsConstants.ApiPath}/${testGroup.id}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.include({
      ...testGroup,
    });
    chai.expect(res.body._lang_en).to.exist;
    chai.expect(res.body._lang_ro).to.exist;
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];
    const testGroupID = testGroup.id;

    testGroup.name = 'new name';
    delete testGroup.id;
    delete testGroup.type;
    delete testGroup._lang_en;

    // call put first to update users
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${GroupsConstants.ApiPath}/${testGroupID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testGroup });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.status).to.equal(200);

    // events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // call
    res = await chai
      .request(TestConstants.WebServer)
      .delete(`${GroupsConstants.ApiPath}/${testGroupID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testGroupID);

    // events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // do a get
    testGroup.id = res.body.id;
    res = await chai
      .request(TestConstants.WebServer)
      .get(`${GroupsConstants.ApiPath}/${testGroup.id}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(404);
    chai.expect(res.body.message).to.include('Not found');
  }).timeout(10000);

  /**
   * put with success
   */
  it('should put with success', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = _.cloneDeep(testGroups[0]);
    const testGroupID = testGroup.id;

    testGroup.name = 'new name';
    delete testGroup.id;
    delete testGroup.type;
    delete testGroup._lang_en;

    // events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${GroupsConstants.ApiPath}/${testGroupID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testGroup });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testGroupID);
    chai.expect(res.body.name).to.equal(testGroup.name);

    // events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // do a get
    res = await chai
      .request(TestConstants.WebServer)
      .get(`${GroupsConstants.ApiPath}/${testGroupID}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.body.id).to.equal(testGroupID);
    chai.expect(res.body.name).to.equal(testGroup.name);
  }).timeout(10000);

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const testGroups = _.cloneDeep(TestConstants.Groups);
    const testGroup = testGroups[0];
    const testGroupID = testGroup.id;

    testGroup.name = 'new name';
    delete testGroup.id;
    delete testGroup.type;
    delete testGroup._lang_en;

    // events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${GroupsConstants.ApiPath}/${testGroupID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({ set: { ...testGroup } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testGroupID);
    chai.expect(res.body.name).to.equal(testGroup.name);

    // events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // do a get
    res = await chai
      .request(TestConstants.WebServer)
      .get(`${GroupsConstants.ApiPath}/${testGroupID}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.body.id).to.equal(testGroupID);
    chai.expect(res.body.name).to.equal(testGroup.name);
  }).timeout(10000);
});
