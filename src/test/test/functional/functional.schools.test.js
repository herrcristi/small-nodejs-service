const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const SchoolsDatabase = require('../../../services/schools/schools.database.js');
const EventsDatabase = require('../../../services/events/events.database.js');
const SchoolsConstants = require('../../../services/schools/schools.constants.js');
const SchoolsService = require('../../../services/schools/schools.service.js');
const TestsUtils = require('../../tests.utils.js');

describe('Schools Controller', function () {
  let _ctx = { reqID: 'Test-Schools', lang: 'en' };

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
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({
      data: [...testSchools],
      meta: {
        count: testSchools.length,
        limit: 0,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}/${testSchool.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({
      ...testSchool,
    });
  }).timeout(10000);

  /**
   * post fail duplicate name
   */
  it('should post fail duplicate name', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = _.cloneDeep(testSchools[0]);

    delete testSchool.id;
    delete testSchool.type;
    delete testSchool._lang_en;

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${SchoolsConstants.ApiPath}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .send({ ...testSchool });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai
      .expect(res.body.error)
      .to.include('E11000 duplicate key error collection: Small-Test.schools index: name_1 dup key');
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = _.cloneDeep(testSchools[0]);

    testSchool.name = 'new name';
    delete testSchool.id;
    delete testSchool.type;
    delete testSchool._lang_en;

    // check events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${SchoolsConstants.ApiPath}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .send({ ...testSchool });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(res.body.id).to.exist;
    chai.expect(res.body.type).to.equal(testSchools[0].type);
    chai.expect(res.body.status).to.equal(SchoolsConstants.Status.Active);
    chai.expect(res.body.createdTimestamp).to.exist;
    chai.expect(res.body.lastModifiedTimestamp).to.exist;

    // after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // do a get
    testSchool.id = res.body.id;
    res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}/${testSchool.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.include({
      ...testSchool,
    });
    chai.expect(res.body._lang_en).to.exist;
    chai.expect(res.body._lang_ro).to.exist;
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    // check events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .delete(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname');
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testSchool.id);

    // after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // do a get
    testSchool.id = res.body.id;
    res = await chai.request(TestConstants.WebServer).get(`${SchoolsConstants.ApiPath}/${testSchool.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(404);
    chai.expect(res.body.message).to.include('Not found');
  }).timeout(10000);

  // /**
  //  * put with success
  //  */
  // it('should put with success', async () => {
  //   const testSchools = _.cloneDeep(TestConstants.Schools);
  //   const testSchool = testSchools[0];

  //   // stub
  //   let stubService = sinon.stub(SchoolsService, 'put').callsFake(() => {
  //     console.log(`\nSchoolsService.put called\n`);
  //     return {
  //       status: 200,
  //       value: testSchool,
  //     };
  //   });

  //   // call
  //   let res = await chai
  //     .request(TestConstants.WebServer)
  //     .put(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
  //     .send({ ...testSchool });
  //   console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

  //   // check
  //   chai.expect(res.status).to.equal(200);
  //   chai.expect(stubService.callCount).to.equal(1);
  //   chai.expect(res.body).to.deep.equal({
  //     ...testSchool,
  //   });
  // }).timeout(10000);

  // /**
  //  * patch with success
  //  */
  // it('should patch with success', async () => {
  //   const testSchools = _.cloneDeep(TestConstants.Schools);
  //   const testSchool = testSchools[0];

  //   // stub
  //   let stubService = sinon.stub(SchoolsService, 'patch').callsFake(() => {
  //     console.log(`\nSchoolsService.patch called\n`);
  //     return {
  //       status: 200,
  //       value: testSchool,
  //     };
  //   });

  //   // call
  //   let res = await chai
  //     .request(TestConstants.WebServer)
  //     .patch(`${SchoolsConstants.ApiPath}/${testSchool.id}`)
  //     .send({ set: { ...testSchool } });
  //   console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

  //   // check
  //   chai.expect(res.status).to.equal(200);
  //   chai.expect(stubService.callCount).to.equal(1);
  //   chai.expect(res.body).to.deep.equal({
  //     ...testSchool,
  //   });
  // }).timeout(10000);

  // /**
  //  * notification with success
  //  */
  // it('should do notification with success', async () => {
  //   const notifications = _.cloneDeep(TestConstants.SchoolsNotifications);
  //   const notif = notifications[0];

  //   // stub
  //   let stubService = sinon.stub(SchoolsService, 'notification').callsFake(() => {
  //     console.log(`\nSchoolsService.notification called\n`);
  //     return {
  //       status: 200,
  //       value: true,
  //     };
  //   });

  //   // call
  //   let res = await chai
  //     .request(TestConstants.WebServer)
  //     .post(`${SchoolsConstants.ApiPathInternal}/notifications`)
  //     .send({ ...notif });
  //   console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

  //   // check
  //   chai.expect(res.status).to.equal(200);
  //   chai.expect(stubService.callCount).to.equal(1);
  //   chai.expect(res.body).to.deep.equal(true);
  // }).timeout(10000);
});
