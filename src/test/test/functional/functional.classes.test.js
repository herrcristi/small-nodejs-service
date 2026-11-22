const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

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
      return { status: 200, value: { userID: 'user.id', username: 'user.email', tenantVerified: true } };
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
    let res = await supertest(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({
      data: [...testClasses],
      meta: {
        count: testClasses.length,
        limit: 10000,
        skip: 0,
        sort: {
          name: 1,
        },
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
    let res = await supertest(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .set('Origin', TestConstants.WebServer);
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
    let res = await supertest(TestConstants.WebServer)
      .post(`${ClassesConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testClass });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check: a conflict, with the field that is already used (not the text of the database)
    chai.expect(res.status).to.equal(409);
    chai.expect(res.body.detail).to.equal('"name" is already used');
    chai.expect(JSON.stringify(res.body)).to.not.include('E11000');
  }).timeout(10000);

  /**
   * the list against MongoDB: "All" (limit -1, as the UI sends it) gives every class (a negative limit would give one),
   * and a search finds a text with the characters of a regular expression (c++) and the letters with or without
   * their diacritics (the patterns are the ones the UI builds)
   */
  it('should list all the classes and search them by a text as it is and without diacritics', async () => {
    // stub: two more classes (Mathematics and Politics are the test data)
    for (const name of ['C++ Programming', 'Știința datelor']) {
      const rPost = await supertest(TestConstants.WebServer)
        .post(`${ClassesConstants.ApiPath}`)
        .set('x-tenant-id', _ctx.tenantID)
        .set('Origin', TestConstants.WebServer)
        .send({ name, credits: 4, required: 'optional' });
      chai.expect(rPost.status, name).to.equal(201);
    }
    const list = (params) =>
      supertest(TestConstants.WebServer)
        .get(`${ClassesConstants.ApiPath}?${new URLSearchParams(params).toString()}`)
        .set('x-tenant-id', _ctx.tenantID)
        .set('Origin', TestConstants.WebServer);

    // call: all
    const resAll = await list({ limit: -1 });

    // check: the four classes
    chai.expect(resAll.status).to.equal(200);
    chai.expect(resAll.body.data.length).to.equal(4);

    // case: a negative skip is refused
    chai.expect((await list({ skip: -5 })).status).to.equal(400);

    // case: c++ as it is
    const resCpp = await list({ name: '/c\\+\\+/i' });
    chai.expect(resCpp.body.data.map((item) => item.name)).to.deep.equal(['C++ Programming']);

    // case: stiinta, without its diacritics
    const resDiacritics = await list({ name: '/[sșşSȘŞ][tțţTȚŢ][iîIÎ][iîIÎ]n[tțţTȚŢ][aăâAĂÂ]/i' });
    chai.expect(resDiacritics.body.data.map((item) => item.name)).to.deep.equal(['Știința datelor']);
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
    let res = await supertest(TestConstants.WebServer)
      .post(`${ClassesConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID)
      .set('Origin', TestConstants.WebServer)
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
    res = await supertest(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .set('Origin', TestConstants.WebServer);
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
    let res = await supertest(TestConstants.WebServer)
      .put(`${ClassesConstants.ApiPath}/${testClassID}`)
      .set('x-tenant-id', _ctx.tenantID)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testClass });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.status).to.equal(200);

    // events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // call
    res = await supertest(TestConstants.WebServer)
      .delete(`${ClassesConstants.ApiPath}/${testClassID}`)
      .set('x-tenant-id', _ctx.tenantID)
      .set('Origin', TestConstants.WebServer);
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
    res = await supertest(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClass.id}`)
      .set('x-tenant-id', _ctx.tenantID)
      .set('Origin', TestConstants.WebServer);
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
    let res = await supertest(TestConstants.WebServer)
      .put(`${ClassesConstants.ApiPath}/${testClassID}`)
      .set('x-tenant-id', _ctx.tenantID)
      .set('Origin', TestConstants.WebServer)
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
    res = await supertest(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClassID}`)
      .set('x-tenant-id', _ctx.tenantID)
      .set('Origin', TestConstants.WebServer);
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
    let res = await supertest(TestConstants.WebServer)
      .patch(`${ClassesConstants.ApiPath}/${testClassID}`)
      .set('x-tenant-id', _ctx.tenantID)
      .set('Origin', TestConstants.WebServer)
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
    res = await supertest(TestConstants.WebServer)
      .get(`${ClassesConstants.ApiPath}/${testClassID}`)
      .set('x-tenant-id', _ctx.tenantID)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.body.id).to.equal(testClassID);
    chai.expect(res.body.name).to.equal(testClass.name);
  }).timeout(10000);
});
