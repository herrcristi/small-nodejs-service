const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');

const SchoolsDatabase = require('../../../services/schools/schools.database.js');
const UsersDatabase = require('../../../services/users/users.database.js');
const StudentsDatabase = require('../../../services/students/students.database.js');
const ProfessorsDatabase = require('../../../services/professors/professors.database.js');
const EventsDatabase = require('../../../services/events/events.database.js');

const UsersRest = require('../../../services/rest/users.rest.js');
const UsersConstants = require('../../../services/users/users.constants.js');
const TestsUtils = require('../../tests.utils.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const RestCommunicationsUtils = require('../../../core/utils/rest-communications.utils.js');

describe('Users Functional', function () {
  let _ctx = { reqID: 'Test-Users', lang: 'en' };

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
   * check schools before for events/students/professors
   */
  checkSchoolsBefore = async (testUser, _ctx) => {
    // events/students/professors before (in each school)
    for (const school of testUser.schools) {
      let eventsSchoolCountBefore = await (
        await EventsDatabase.collection({ ..._ctx, tenantID: school.id })
      ).countDocuments();
      console.log(`\nEvents for schools ${school.id} count before: ${eventsSchoolCountBefore}\n`);
      chai.expect(eventsSchoolCountBefore).to.equal(0);

      let studentsBefore = await (await StudentsDatabase.collection({ ..._ctx, tenantID: school.id }))
        .find({})
        .toArray();
      console.log(`\nStudents for school ${school.id} before: ${JSON.stringify(studentsBefore, null, 2)}\n`);
      chai.expect(studentsBefore.length).to.equal(0);

      let professorsBefore = await (await ProfessorsDatabase.collection({ ..._ctx, tenantID: school.id }))
        .find({})
        .toArray();
      console.log(`\nProfessors for school ${school.id} before: ${JSON.stringify(professorsBefore, null, 2)}\n`);
      chai.expect(professorsBefore.length).to.equal(0);
    }
  };

  /**
   * check schools after for events/students/professors
   */
  checkSchoolsAfter = async (testUserID, testUser, testUserStatus, _ctx) => {
    const testStudentSchoolsIDs = testUser.schools
      .filter((item) => item.roles.includes('student'))
      .map((item) => item.id);
    const testProfessorSchoolsIDs = testUser.schools
      .filter((item) => item.roles.includes('professor'))
      .map((item) => item.id);

    // events/students/professors after (in each school)
    for (const school of testUser.schools) {
      let expectedEvents = 0;
      let studentsAfter = await (await StudentsDatabase.collection({ ..._ctx, tenantID: school.id }))
        .find({})
        .toArray();
      console.log(`\nStudents for school ${school.id} after: ${JSON.stringify(studentsAfter, null, 2)}\n`);

      if (testStudentSchoolsIDs.includes(school.id)) {
        expectedEvents++;
        chai.expect(studentsAfter.length).to.equal(1);

        chai.expect(studentsAfter.map((item) => item.id).includes(testUserID)).to.equal(true);
        for (const student of studentsAfter) {
          if (student.id === testUserID) {
            chai.expect(student.user.name).to.equal(testUser.name);
            chai.expect(student.user.email).to.equal(testUser.email);
            chai.expect(student.user.status).to.equal(testUserStatus);
          }
        }
      } else {
        chai.expect(studentsAfter.length).to.equal(0);
      }

      let professorsAfter = await (await ProfessorsDatabase.collection({ ..._ctx, tenantID: school.id }))
        .find({})
        .toArray();
      console.log(`\nProfessors for school ${school.id} after: ${JSON.stringify(professorsAfter, null, 2)}\n`);

      if (testProfessorSchoolsIDs.includes(school.id)) {
        expectedEvents++;
        chai.expect(professorsAfter.length).to.equal(1);

        chai.expect(professorsAfter.map((item) => item.id).includes(testUserID)).to.equal(true);
        for (const professor of professorsAfter) {
          if (professor.id === testUserID) {
            chai.expect(professor.user.name).to.equal(testUser.name);
            chai.expect(professor.user.email).to.equal(testUser.email);
            chai.expect(professor.user.status).to.equal(testUserStatus);
          }
        }
      } else {
        chai.expect(professorsAfter.length).to.equal(0);
      }

      let eventsSchoolCountAfter = await (
        await EventsDatabase.collection({ ..._ctx, tenantID: school.id })
      ).countDocuments();
      console.log(`\nEvents for schools ${school.id} count after: ${eventsSchoolCountAfter}\n`);
      chai.expect(eventsSchoolCountAfter).to.equal(expectedEvents);
    }
  };

  /**
   * getAll with success
   */
  it('should getAll with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPathInternal}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({
      data: [...testUsers],
      meta: {
        count: testUsers.length,
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
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}/${testUser.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * post fail duplicate email
   */
  it('should post fail duplicate email', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = _.cloneDeep(testUsers[0]);

    const postReq = {
      email: testUser.email,
      name: testUser.name,
      schools: testUser.schools,
    };

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPathInternal}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .send({ ...postReq });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai
      .expect(res.body.error)
      .to.include('E11000 duplicate key error collection: Small-Test.users index: email_1 dup key');
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = _.cloneDeep(testUsers[0]);

    const postReq = {
      email: 'newemail@test.com',
      name: 'new name',
      schools: testUser.schools,
    };

    // check global events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // events/students/professors before (in each school)
    await checkSchoolsBefore(testUser, _ctx);

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersConstants.ApiPathInternal}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .send({ ...postReq });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(res.body.id).to.exist;
    chai.expect(res.body.type).to.equal(testUsers[0].type);
    chai.expect(res.body.status).to.equal(UsersConstants.Status.Pending);
    chai.expect(res.body.createdTimestamp).to.exist;
    chai.expect(res.body.lastModifiedTimestamp).to.exist;

    const testUserID = res.body.id;

    // global events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // events/students/professors after (in each school)
    await checkSchoolsAfter(
      testUserID,
      { ...testUser, email: 'newemail@test.com', name: 'new name' },
      UsersConstants.Status.Pending,
      _ctx
    );

    // do a get
    res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}/${testUserID}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect({ ...res.body, schools: undefined }).to.deep.include({
      id: testUserID,
      email: 'newemail@test.com',
      name: 'new name',
      status: UsersConstants.Status.Pending,
      schools: undefined,
    });
    chai.expect(res.body._lang_en).to.exist;
    chai.expect(res.body._lang_ro).to.exist;
    for (const school of res.body.schools) {
      chai.expect(school.name).to.exist;
      chai.expect(school.type).to.equal('school');
      chai.expect(school.status).to.exist;
    }
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = _.cloneDeep(testUsers[0]);
    const testUserID = testUser.id;

    const { name, email, schools } = testUser;

    delete testUser.id;
    delete testUser.type;
    delete testUser.email;
    delete testUser.schools;
    delete testUser._lang_en;

    // events/students/professors before (in each school)
    await checkSchoolsBefore({ schools }, _ctx);

    // call put first to update users and create students, professors, etc ...
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersConstants.ApiPath}/${testUserID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.status).to.equal(200);

    // events/students/professors after put (in each school)
    await checkSchoolsAfter(testUserID, { name, email, schools }, testUser.status, _ctx);

    // check global events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    res = await chai
      .request(TestConstants.WebServer)
      .delete(`${UsersConstants.ApiPathInternal}/${testUserID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname');
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testUserID);

    // global events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // check events/students/professors after (should remain the same with status disabled even after user is deleted)
    await checkSchoolsAfter(testUserID, { name, email, schools }, UsersRest.Constants.Status.Disabled, _ctx);

    // do a get
    testUser.id = res.body.id;
    res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}/${testUser.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(404);
    chai.expect(res.body.message).to.include('Not found');
  }).timeout(10000);

  /**
   * put with success
   */
  it('should put with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = _.cloneDeep(testUsers[0]);
    const testUserID = testUser.id;

    const { name, email, schools } = testUser;

    testUser.name = 'new name';
    delete testUser.id;
    delete testUser.type;
    delete testUser.email;
    delete testUser.schools;
    delete testUser._lang_en;

    // global events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // events/students/professors before (in each school)
    await checkSchoolsBefore({ name, email, schools }, _ctx);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersConstants.ApiPath}/${testUserID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.status).to.equal(200);

    // global events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // events/students/professors after (in each school)
    await checkSchoolsAfter(testUserID, { name: 'new name', email, schools }, testUser.status, _ctx);

    // do a get
    res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}/${testUserID}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.body.id).to.equal(testUserID);
    chai.expect(res.body.name).to.equal(testUser.name);
  }).timeout(10000);

  /**
   * putEmail with success
   */
  it('should putEmail with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = _.cloneDeep(testUsers[0]);
    const testUserID = testUser.id;

    const { name, email, schools } = testUser;
    const newEmail = 'newemail@test.com';

    // global events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // events/students/professors before (in each school)
    await checkSchoolsBefore({ name, email, schools }, _ctx);

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${UsersConstants.ApiPathInternal}/${testUserID}/email`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .send({ email: newEmail });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.status).to.equal(200);

    // global events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // events/students/professors after (in each school)
    await checkSchoolsAfter(testUserID, { name, email: newEmail, schools }, testUser.status, _ctx);

    // do a get
    res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}/${testUserID}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.body.id).to.equal(testUserID);
    chai.expect(res.body.name).to.equal(testUser.name);
  }).timeout(10000);

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = _.cloneDeep(testUsers[0]);
    const testUserID = testUser.id;

    const { name, email, schools } = testUser;

    testUser.name = 'new name';
    delete testUser.id;
    delete testUser.type;
    delete testUser.email;
    delete testUser.schools;
    delete testUser._lang_en;

    // global events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // events/students/professors before (in each school)
    await checkSchoolsBefore({ name, email, schools }, _ctx);

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersConstants.ApiPath}/${testUserID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testUserID);
    chai.expect(res.body.name).to.equal(testUser.name);

    // global events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // events/students/professors after put (in each school)
    await checkSchoolsAfter(testUserID, { name: 'new name', email, schools }, testUser.status, _ctx);

    // do a get
    res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}/${testUserID}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.body.id).to.equal(testUserID);
    chai.expect(res.body.name).to.equal(testUser.name);
  }).timeout(10000);

  /**
   * patchSchools with success
   */
  it('should patchSchools with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = _.cloneDeep(testUsers[0]);
    const testUserID = testUser.id;

    const { name, email, schools } = testUser;
    const schoolsAfter = _.cloneDeep(schools);
    schoolsAfter[0].roles = schoolsAfter[0].roles.slice(1);
    schoolsAfter[1].roles = schoolsAfter[1].roles.slice(1);

    const patchReq = {
      remove: {
        schools: [
          {
            id: schools[0].id, // remove first school
            roles: schools[0].roles.slice(0, 1), // remove first role
          },
          {
            id: schools[1].id,
            roles: schools[1].roles.slice(0, 1), // remove first role
          },
        ],
      },
    };

    // global events before
    let eventsCountBefore = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count before: ${eventsCountBefore}\n`);

    // events/students/professors before (in each school)
    await checkSchoolsBefore({ name, email, schools }, _ctx);

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${UsersConstants.ApiPathInternal}/${testUserID}/school`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .send(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body.id).to.equal(testUserID);
    chai.expect(res.body.name).to.equal(testUser.name);

    // global events after
    let eventsCountAfter = await (await EventsDatabase.collection(_ctx)).countDocuments();
    console.log(`\nEvents count after: ${eventsCountAfter}\n`);
    chai.expect(eventsCountAfter).to.equal(eventsCountBefore + 1);

    // events/students/professors after put (in each school)
    await checkSchoolsAfter(testUserID, { name, email, schools: schoolsAfter }, testUser.status, _ctx);

    // do a get
    res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}/${testUserID}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    chai.expect(res.body.id).to.equal(testUserID);
    chai.expect(res.body.name).to.equal(testUser.name);
  }).timeout(10000);
});
