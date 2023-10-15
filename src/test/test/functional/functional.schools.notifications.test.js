const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const UsersDatabase = require('../../../services/users/users.database.js');

const SchoolsConstants = require('../../../services/schools/schools.constants.js');
const TestsUtils = require('../../tests.utils.js');

describe('Notifications functional', function () {
  let _ctx = { reqID: 'Test-Notifications', lang: 'en' };

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
   * put schools and update users
   */
  it('should put schools and update users', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = _.cloneDeep(testSchools[0]);
    const testSchoolID = testSchool.id;

    testSchool.name = 'new name';
    delete testSchool.id;
    delete testSchool.type;
    delete testSchool._lang_en;

    // check users before
    let users = await (await UsersDatabase.collection(_ctx)).find({ 'schools.id': testSchoolID }).toArray();
    console.log(`\nUsers before: ${JSON.stringify(users, null, 2)}\n`);
    chai.expect(users.length).to.equal(TestConstants.Users.length);
    for (const user of users) {
      for (const school of user.schools) {
        if (school.id === testSchool.id) {
          chai.expect(school.name).to.not.exist;
          chai.expect(school.type).to.not.exist;
          chai.expect(school.status).to.not.exist;
        }
      }
    }

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${SchoolsConstants.ApiPath}/${testSchoolID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .send({ ...testSchool });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);

    // check users after
    users = await (await UsersDatabase.collection(_ctx)).find({ 'schools.id': testSchoolID }).toArray();
    console.log(`\nUsers after: ${JSON.stringify(users, null, 2)}\n`);
    chai.expect(users.length).to.equal(TestConstants.Users.length);
    for (const user of users) {
      for (const school of user.schools) {
        if (school.id === testSchool.id) {
          chai.expect(school.name).to.equal(testSchool.name);
          chai.expect(school.type).to.equal(testSchool.type);
          chai.expect(school.status).to.equal(testSchool.status);
        }
      }
    }
  }).timeout(10000);

  /**
   * patch schools and update users
   */
  it('should patch schools and update users', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = _.cloneDeep(testSchools[0]);
    const testSchoolID = testSchool.id;

    testSchool.name = 'new name';
    delete testSchool.id;
    delete testSchool.type;
    delete testSchool._lang_en;

    // check users before
    let users = await (await UsersDatabase.collection(_ctx)).find({ 'schools.id': testSchoolID }).toArray();
    console.log(`\nUsers before: ${JSON.stringify(users, null, 2)}\n`);
    chai.expect(users.length).to.equal(TestConstants.Users.length);
    for (const user of users) {
      for (const school of user.schools) {
        if (school.id === testSchool.id) {
          chai.expect(school.name).to.not.exist;
          chai.expect(school.type).to.not.exist;
          chai.expect(school.status).to.not.exist;
        }
      }
    }

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .patch(`${SchoolsConstants.ApiPath}/${testSchoolID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .send({ set: { ...testSchool } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);

    // check users after
    users = await (await UsersDatabase.collection(_ctx)).find({ 'schools.id': testSchoolID }).toArray();
    console.log(`\nUsers after: ${JSON.stringify(users, null, 2)}\n`);
    chai.expect(users.length).to.equal(TestConstants.Users.length);
    for (const user of users) {
      for (const school of user.schools) {
        if (school.id === testSchool.id) {
          chai.expect(school.name).to.equal(testSchool.name);
          chai.expect(school.type).to.equal(testSchool.type);
          chai.expect(school.status).to.equal(testSchool.status);
        }
      }
    }
  }).timeout(10000);

  /**
   * delete schools and update users
   */
  it('should delete schools and update users', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = _.cloneDeep(testSchools[0]);
    const testSchoolID = testSchool.id;

    testSchool.name = 'new name';
    delete testSchool.id;
    delete testSchool.type;
    delete testSchool._lang_en;

    // check users before
    let users = await (await UsersDatabase.collection(_ctx)).find({ 'schools.id': testSchoolID }).toArray();
    console.log(`\nUsers before: ${JSON.stringify(users, null, 2)}\n`);
    chai.expect(users.length).to.equal(TestConstants.Users.length);
    for (const user of users) {
      for (const school of user.schools) {
        if (school.id === testSchool.id) {
          chai.expect(school.name).to.not.exist;
          chai.expect(school.type).to.not.exist;
          chai.expect(school.status).to.not.exist;
        }
      }
    }

    // call put first to update users
    let res = await chai
      .request(TestConstants.WebServer)
      .put(`${SchoolsConstants.ApiPath}/${testSchoolID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname')
      .send({ ...testSchool });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);

    // check users after put
    users = await (await UsersDatabase.collection(_ctx)).find({ 'schools.id': testSchoolID }).toArray();
    console.log(`\nUsers after: ${JSON.stringify(users, null, 2)}\n`);
    chai.expect(users.length).to.equal(TestConstants.Users.length);
    for (const user of users) {
      for (const school of user.schools) {
        if (school.id === testSchool.id) {
          chai.expect(school.name).to.equal(testSchool.name);
          chai.expect(school.type).to.equal(testSchool.type);
          chai.expect(school.status).to.equal(testSchool.status);
        }
      }
    }

    // call delete
    res = await chai
      .request(TestConstants.WebServer)
      .delete(`${SchoolsConstants.ApiPath}/${testSchoolID}`)
      .set('x-user-id', 'testid')
      .set('x-user-name', 'testname');
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);

    // check users after delete
    users = await (await UsersDatabase.collection(_ctx)).find({ 'schools.id': testSchoolID }).toArray();
    console.log(`\nUsers with school after: ${JSON.stringify(users, null, 2)}\n`);
    chai.expect(users.length).to.equal(0);
  }).timeout(10000);
});
