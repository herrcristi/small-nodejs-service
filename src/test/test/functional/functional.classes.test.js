const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');

const ClassesDatabase = require('../../../services/classes/classes.database.js');
const UsersDatabase = require('../../../services/users/users.database.js');
const EventsDatabase = require('../../../services/events/events.database.js');

const ClassesConstants = require('../../../services/classes/classes.constants.js');
const TestsUtils = require('../../tests.utils.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');

describe('Classes Functional', function () {
  let _ctx = { reqID: 'Test-Classes', tenantID: TestConstants.Schools[0].id, lang: 'en' };

  before(async function () {});

  beforeEach(async function () {
    sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { success: true, value: { userID: 'user.id', username: 'user.email' } };
    });
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
    const testClasses = _.cloneDeep(TestConstants.Classes);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({
      data: [...testClasses],
      meta: {
        count: testClasses.length,
        limit: 0,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({
      ...testClass,
    });
  }).timeout(10000);

  /**
   * post fail duplicate name
   */
  it('should post fail duplicate name', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = _.cloneDeep(testClasses[0]);

    delete testClass.id;
    delete testClass.type;
    delete testClass._lang_en;

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${ClassesConstants.ApiPath}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testClass });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai
      .expect(res.body.error)
      .to.include(`E11000 duplicate key error collection: Small-Test.classes_${_ctx.tenantID} index: name_1 dup key`);
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = _.cloneDeep(testClasses[0]);

    testClass.name = 'new name';
    delete testClass.id;
    delete testClass.type;
    delete testClass._lang_en;

    // check events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${ClassesConstants.ApiPath}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testClass });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(res.body.id).to.exist;
    chai.expect(res.body.type).to.equal(testClasses[0].type);
    chai.expect(res.body.status).to.equal(ClassesConstants.Status.Active);
    chai.expect(res.body.createdTimestamp).to.exist;
    chai.expect(res.body.lastModifiedTimestamp).to.exist;

    // after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // do a get
    testClass.id = res.body.id;
    res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.include({
      ...testClass,
    });
    chai.expect(res.body._lang_en).to.exist;
    chai.expect(res.body._lang_ro).to.exist;
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];
    const testClassID = testClass.id;

    testClass.name = 'new name';
    delete testClass.id;
    delete testClass.type;
    delete testClass._lang_en;

    // call put first to update users
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${ClassesConstants.ApiPath}/${testClassID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testClass });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.status).to.equal(200);

    // events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // call
    res = await chai
      .request(TestConstants.WebServer)
      .delete(`${ClassesConstants.ApiPath}/${testClassID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testClassID);

    // events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // do a get
    testClass.id = res.body.id;
    res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClass.id}`)
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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = _.cloneDeep(testClasses[0]);
    const testClassID = testClass.id;

    testClass.name = 'new name';
    delete testClass.id;
    delete testClass.type;
    delete testClass._lang_en;

    // events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${ClassesConstants.ApiPath}/${testClassID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({ ...testClass });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testClassID);
    chai.expect(res.body.name).to.equal(testClass.name);

    // events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // do a get
    res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClassID}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.body.id).to.equal(testClassID);
    chai.expect(res.body.name).to.equal(testClass.name);
  }).timeout(10000);

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];
    const testClassID = testClass.id;

    testClass.name = 'new name';
    delete testClass.id;
    delete testClass.type;
    delete testClass._lang_en;

    // events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${ClassesConstants.ApiPath}/${testClassID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({ set: { ...testClass } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testClassID);
    chai.expect(res.body.name).to.equal(testClass.name);

    // events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // do a get
    res = await chai
      .request(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClassID}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.body.id).to.equal(testClassID);
    chai.expect(res.body.name).to.equal(testClass.name);
  }).timeout(10000);
});
