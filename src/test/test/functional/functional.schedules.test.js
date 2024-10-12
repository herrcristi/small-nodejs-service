const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');

const SchedulesDatabase = require('../../../services/schedules/schedules.database.js');
const UsersDatabase = require('../../../services/users/users.database.js');
const LocationsDatabase = require('../../../services/locations/locations.database.js');
const ProfessorsDatabase = require('../../../services/professors/professors.database.js');
const GroupsDatabase = require('../../../services/groups/groups.database.js');
const StudentsDatabase = require('../../../services/students/students.database.js');
const EventsDatabase = require('../../../services/events/events.database.js');

const SchedulesConstants = require('../../../services/schedules/schedules.constants.js');
const TestsUtils = require('../../tests.utils.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');

describe('Schedules Functional', function () {
  let _ctx = { reqID: 'Test-Schedules', tenantID: TestConstants.Schools[0].id, lang: 'en' };

  before(async function () {});

  beforeEach(async function () {
    sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { status: 200, value: { userID: 'user.id', username: 'user.email' } };
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
    const testSchedules = _.cloneDeep(TestConstants.Schedules);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${SchedulesConstants.ApiPath}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({
      data: [...testSchedules],
      meta: {
        count: testSchedules.length,
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
    const testSchedules = _.cloneDeep(TestConstants.Schedules);
    const testSchedule = testSchedules[0];

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${SchedulesConstants.ApiPath}/${testSchedule.id}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({
      ...testSchedule,
    });
  }).timeout(10000);

  /**
   * post fail duplicate name
   */
  it('should post fail duplicate name', async () => {
    const testSchedules = _.cloneDeep(TestConstants.Schedules);
    let testSchedule = _.cloneDeep(testSchedules[0]);

    delete testSchedule.id;
    delete testSchedule.type;
    delete testSchedule._lang_en;

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${SchedulesConstants.ApiPath}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({
        ...testSchedule,
        class: testSchedule.class.id,
        schedules: [{ ...testSchedule.schedules[0], location: testSchedule.schedules[0].location.id }],
        professors: [{ id: testSchedule.professors[0].id }],
        groups: [{ id: testSchedule.groups[0].id }],
        students: [{ id: testSchedule.students[0].id }],
      });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai
      .expect(res.body.error)
      .to.include(`E11000 duplicate key error collection: Small-Test.schedules_${_ctx.tenantID} index: name_1 dup key`);
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testSchedules = _.cloneDeep(TestConstants.Schedules);
    const testSchedule = _.cloneDeep(testSchedules[0]);

    testSchedule.name = 'new name';
    delete testSchedule.id;
    delete testSchedule.type;
    delete testSchedule._lang_en;

    // check events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // check professors before
    let professorsBefore = await (
      await ProfessorsDatabase.collection(_ctx)
    ).findOne({ id: testSchedule.professors[0].id });
    console.log(`\nProfessors before: ${JSON.stringify(professorsBefore, null, 2)}\n`);
    chai.expect(professorsBefore.schedules.length).to.equal(1);

    // check groups before
    let groupsBefore = await (await GroupsDatabase.collection(_ctx)).findOne({ id: testSchedule.groups[0].id });
    console.log(`\nGroups before: ${JSON.stringify(groupsBefore, null, 2)}\n`);
    chai.expect(groupsBefore.schedules.length).to.equal(1);

    // check students before
    let studentsBefore = await (await StudentsDatabase.collection(_ctx)).findOne({ id: testSchedule.students[0].id });
    console.log(`\nStudents before: ${JSON.stringify(studentsBefore, null, 2)}\n`);
    chai.expect(studentsBefore.schedules.length).to.equal(1);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${SchedulesConstants.ApiPath}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({
        ...testSchedule,
        class: testSchedule.class.id,
        schedules: [{ ...testSchedule.schedules[0], location: testSchedule.schedules[0].location.id }],
        professors: [{ id: testSchedule.professors[0].id }],
        groups: [{ id: testSchedule.groups[0].id }],
        students: [{ id: testSchedule.students[0].id }],
      });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(res.body.id).to.exist;
    chai.expect(res.body.type).to.equal(testSchedules[0].type);
    chai.expect(res.body.status).to.equal(SchedulesConstants.Status.Active);
    chai.expect(res.body.createdTimestamp).to.exist;
    chai.expect(res.body.lastModifiedTimestamp).to.exist;

    // after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // check professors after
    let professorsAfter = await (
      await ProfessorsDatabase.collection(_ctx)
    ).findOne({ id: testSchedule.professors[0].id });
    console.log(`\nProfessors after: ${JSON.stringify(professorsAfter, null, 2)}\n`);
    chai.expect(professorsAfter.schedules.length).to.equal(2);

    // check groups after
    let groupsAfter = await (await GroupsDatabase.collection(_ctx)).findOne({ id: testSchedule.groups[0].id });
    console.log(`\nGroups after: ${JSON.stringify(groupsAfter, null, 2)}\n`);
    chai.expect(groupsAfter.schedules.length).to.equal(2);

    // check students after
    let studentsAfter = await (await StudentsDatabase.collection(_ctx)).findOne({ id: testSchedule.students[0].id });
    console.log(`\nStudents after: ${JSON.stringify(studentsAfter, null, 2)}\n`);
    chai.expect(studentsAfter.schedules.length).to.equal(2);

    // do a get
    testSchedule.id = res.body.id;
    res = await chai
      .request(TestConstants.WebServer)
      .get(`${SchedulesConstants.ApiPath}/${testSchedule.id}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.include({
      ...testSchedule,
      groups: [
        {
          ...testSchedule.groups[0],
          students: [
            {
              id: 'user1',
              user: {
                id: 'user1',
                name: 'Big Ben',
                type: 'user',
                status: 'active',
                email: 'big.ben@testdomain.test',
              },
              type: 'student',
            },
          ],
        },
      ],
    });
    chai.expect(res.body._lang_en).to.exist;
    chai.expect(res.body._lang_ro).to.exist;
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testSchedules = _.cloneDeep(TestConstants.Schedules);
    const testSchedule = testSchedules[0];
    const testScheduleID = testSchedule.id;

    // events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // check professors before
    let professorsBefore = await (
      await ProfessorsDatabase.collection(_ctx)
    ).findOne({ id: testSchedule.professors[0].id });
    console.log(`\nProfessors before: ${JSON.stringify(professorsBefore, null, 2)}\n`);
    chai.expect(professorsBefore.schedules.length).to.equal(1);

    // check groups before
    let groupsBefore = await (await GroupsDatabase.collection(_ctx)).findOne({ id: testSchedule.groups[0].id });
    console.log(`\nGroups before: ${JSON.stringify(groupsBefore, null, 2)}\n`);
    chai.expect(groupsBefore.schedules.length).to.equal(1);

    // check students before
    let studentsBefore = await (await StudentsDatabase.collection(_ctx)).findOne({ id: testSchedule.students[0].id });
    console.log(`\nStudents before: ${JSON.stringify(studentsBefore, null, 2)}\n`);
    chai.expect(studentsBefore.schedules.length).to.equal(1);

    // call
    res = await chai
      .request(TestConstants.WebServer)
      .delete(`${SchedulesConstants.ApiPath}/${testScheduleID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testScheduleID);

    // events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // check professors after
    let professorsAfter = await (
      await ProfessorsDatabase.collection(_ctx)
    ).findOne({ id: testSchedule.professors[0].id });
    console.log(`\nProfessors after: ${JSON.stringify(professorsAfter, null, 2)}\n`);
    chai.expect(professorsAfter.schedules.length).to.equal(0);

    // check groups after
    let groupsAfter = await (await GroupsDatabase.collection(_ctx)).findOne({ id: testSchedule.groups[0].id });
    console.log(`\nGroups after: ${JSON.stringify(groupsAfter, null, 2)}\n`);
    chai.expect(groupsAfter.schedules.length).to.equal(0);

    // check students after
    let studentsAfter = await (await StudentsDatabase.collection(_ctx)).findOne({ id: testSchedule.students[0].id });
    console.log(`\nStudents after: ${JSON.stringify(studentsAfter, null, 2)}\n`);
    chai.expect(studentsAfter.schedules.length).to.equal(0);

    // do a get
    testSchedule.id = res.body.id;
    res = await chai
      .request(TestConstants.WebServer)
      .get(`${SchedulesConstants.ApiPath}/${testSchedule.id}`)
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
    const testSchedules = _.cloneDeep(TestConstants.Schedules);
    const testSchedule = _.cloneDeep(testSchedules[0]);
    const testScheduleID = testSchedule.id;

    testSchedule.name = 'new name';
    delete testSchedule.id;
    delete testSchedule.type;
    delete testSchedule._lang_en;

    // events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // check professors before
    let professorsBefore = await (
      await ProfessorsDatabase.collection(_ctx)
    ).findOne({ id: testSchedule.professors[0].id });
    console.log(`\nProfessors before: ${JSON.stringify(professorsBefore, null, 2)}\n`);
    chai.expect(professorsBefore.schedules.length).to.equal(1);

    // check groups before
    let groupsBefore = await (await GroupsDatabase.collection(_ctx)).findOne({ id: testSchedule.groups[0].id });
    console.log(`\nGroups before: ${JSON.stringify(groupsBefore, null, 2)}\n`);
    chai.expect(groupsBefore.schedules.length).to.equal(1);

    // check students before
    let studentsBefore = await (await StudentsDatabase.collection(_ctx)).findOne({ id: testSchedule.students[0].id });
    console.log(`\nStudents before: ${JSON.stringify(studentsBefore, null, 2)}\n`);
    chai.expect(studentsBefore.schedules.length).to.equal(1);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${SchedulesConstants.ApiPath}/${testScheduleID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({
        ...testSchedule,
        class: testSchedule.class.id,
        schedules: [{ ...testSchedule.schedules[0], location: testSchedule.schedules[0].location.id }],
        professors: [{ id: testSchedule.professors[0].id }],
        groups: [{ id: testSchedule.groups[0].id }],
        students: [{ id: testSchedule.students[0].id }],
      });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testScheduleID);
    chai.expect(res.body.name).to.equal(testSchedule.name);

    // events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // check professors after
    let professorsAfter = await (
      await ProfessorsDatabase.collection(_ctx)
    ).findOne({ id: testSchedule.professors[0].id });
    console.log(`\nProfessors after: ${JSON.stringify(professorsAfter, null, 2)}\n`);
    chai.expect(professorsAfter.schedules.length).to.equal(1);

    // check groups after
    let groupsAfter = await (await GroupsDatabase.collection(_ctx)).findOne({ id: testSchedule.groups[0].id });
    console.log(`\nGroups after: ${JSON.stringify(groupsAfter, null, 2)}\n`);
    chai.expect(groupsAfter.schedules.length).to.equal(1);

    // check students after
    let studentsAfter = await (await StudentsDatabase.collection(_ctx)).findOne({ id: testSchedule.students[0].id });
    console.log(`\nStudents after: ${JSON.stringify(studentsAfter, null, 2)}\n`);
    chai.expect(studentsAfter.schedules.length).to.equal(1);

    // do a get
    res = await chai
      .request(TestConstants.WebServer)
      .get(`${SchedulesConstants.ApiPath}/${testScheduleID}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.body.id).to.equal(testScheduleID);
    chai.expect(res.body.name).to.equal(testSchedule.name);
  }).timeout(10000);

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const testSchedules = _.cloneDeep(TestConstants.Schedules);
    const testSchedule = testSchedules[0];
    const testScheduleID = testSchedule.id;

    testSchedule.name = 'new name';
    delete testSchedule.id;
    delete testSchedule.type;
    delete testSchedule._lang_en;

    // events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // check professors before
    let professorsBefore = await (
      await ProfessorsDatabase.collection(_ctx)
    ).findOne({ id: testSchedule.professors[0].id });
    console.log(`\nProfessors before: ${JSON.stringify(professorsBefore, null, 2)}\n`);
    chai.expect(professorsBefore.schedules.length).to.equal(1);

    // check groups before
    let groupsBefore = await (await GroupsDatabase.collection(_ctx)).findOne({ id: testSchedule.groups[0].id });
    console.log(`\nGroups before: ${JSON.stringify(groupsBefore, null, 2)}\n`);
    chai.expect(groupsBefore.schedules.length).to.equal(1);

    // check students before
    let studentsBefore = await (await StudentsDatabase.collection(_ctx)).findOne({ id: testSchedule.students[0].id });
    console.log(`\nStudents before: ${JSON.stringify(studentsBefore, null, 2)}\n`);
    chai.expect(studentsBefore.schedules.length).to.equal(1);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${SchedulesConstants.ApiPath}/${testScheduleID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .set('x-tenant-id', _ctx.tenantID)
      .send({
        set: {
          ...testSchedule,
          class: testSchedule.class.id,
          schedules: [{ ...testSchedule.schedules[0], location: testSchedule.schedules[0].location.id }],
          professors: [{ id: testSchedule.professors[0].id }],
          groups: [{ id: testSchedule.groups[0].id }],
          students: [{ id: testSchedule.students[0].id }],
        },
      });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testScheduleID);
    chai.expect(res.body.name).to.equal(testSchedule.name);

    // events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // check professors after
    let professorsAfter = await (
      await ProfessorsDatabase.collection(_ctx)
    ).findOne({ id: testSchedule.professors[0].id });
    console.log(`\nProfessors after: ${JSON.stringify(professorsAfter, null, 2)}\n`);
    chai.expect(professorsAfter.schedules.length).to.equal(1);

    // check groups after
    let groupsAfter = await (await GroupsDatabase.collection(_ctx)).findOne({ id: testSchedule.groups[0].id });
    console.log(`\nGroups after: ${JSON.stringify(groupsAfter, null, 2)}\n`);
    chai.expect(groupsAfter.schedules.length).to.equal(1);

    // check students after
    let studentsAfter = await (await StudentsDatabase.collection(_ctx)).findOne({ id: testSchedule.students[0].id });
    console.log(`\nStudents after: ${JSON.stringify(studentsAfter, null, 2)}\n`);
    chai.expect(studentsAfter.schedules.length).to.equal(1);

    // do a get
    res = await chai
      .request(TestConstants.WebServer)
      .get(`${SchedulesConstants.ApiPath}/${testScheduleID}`)
      .set('x-tenant-id', _ctx.tenantID);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.body.id).to.equal(testScheduleID);
    chai.expect(res.body.name).to.equal(testSchedule.name);
  }).timeout(10000);
});
