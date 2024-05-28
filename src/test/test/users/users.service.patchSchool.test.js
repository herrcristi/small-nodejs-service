const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');
const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersConstants = require('../../../services/users/users.constants.js');
const UsersService = require('../../../services/users/users.service.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Users Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * patchSchool with success no remove
   */
  it('should patchSchool with success no remove', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    const patchReq = {
      add: {
        schools: _.cloneDeep(testUser.schools),
      },
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchObj) => {
      console.log(`\nDbOpsUtils.patch called`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubUsersRest = sinon.stub(UsersRest, 'raiseNotification').callsFake(() => {
      console.log(`\nUsersRest raiseNotification called`);
    });

    // call
    let res = await UsersService.patchSchool(testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubUsersRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testUser.id,
        name: testUser.name,
        type: testUser.type,
        status: testUser.status,
      },
    });
  }).timeout(10000);

  /**
   * patchSchool with success with remove
   */
  it('should patchSchool with success with remove', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // remove first school completely
    // remove first role from second school
    const patchReq = {
      remove: {
        schools: _.cloneDeep(testUser.schools.slice(0, 2)),
      },
    };
    patchReq.remove.schools[1].roles = patchReq.remove.schools[1].roles.slice(0, 1);

    const remainingSchools = _.cloneDeep(testUser.schools.slice(1));
    remainingSchools[0].roles = remainingSchools[0].roles.slice(1);

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchInfo) => {
      console.log(`\nDbOpsUtils.patch called ${JSON.stringify({ objID, patchInfo }, null, 2)}`);

      return {
        status: 200,
        value: { ...testUser, schools: remainingSchools },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake((service, action, objTarget, objArg) => {
      console.log(
        `\nEventsRest.raiseEventForObject called ${JSON.stringify({ service, action, objTarget, objArg }, null, 2)}`
      );
    });

    let stubUsersRest = sinon.stub(UsersRest, 'raiseNotification');
    stubUsersRest.onCall(0).callsFake((notificationType, objs) => {
      console.log(`\nUsersRest raiseNotification called`);
      console.log(`\nNotificationType: ${JSON.stringify(notificationType, null, 2)}`);
      console.log(`\nNotifications: ${JSON.stringify(objs, null, 2)}`);

      chai.expect(notificationType).to.equal(NotificationsUtils.Constants.Notification.Modified);
      chai.expect(objs).to.deep.equal([
        {
          id: testUser.id,
          name: testUser.name,
          type: testUser.type,
          status: testUser.status,
          email: testUser.email,
          schools: remainingSchools,
        },
      ]);
    });
    stubUsersRest.onCall(1).callsFake((notificationType, objs) => {
      console.log(`\nUsersRest raiseNotification called`);
      console.log(`\nNotificationType: ${JSON.stringify(notificationType, null, 2)}`);
      console.log(`\nNotifications: ${JSON.stringify(objs, null, 2)}`);

      chai.expect(notificationType).to.equal(NotificationsUtils.Constants.Notification.Removed);
      chai.expect(objs).to.deep.equal([
        {
          id: testUser.id,
          name: testUser.name,
          type: testUser.type,
          status: testUser.status,
          email: testUser.email,
          schools: [
            testUser.schools[0],
            {
              ...testUser.schools[1],
              roles: testUser.schools[1].roles.slice(0, 1),
            },
          ],
        },
      ]);
    });

    // call
    let res = await UsersService.patchSchool(testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubUsersRest.callCount).to.equal(2);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testUser.id,
        name: testUser.name,
        type: testUser.type,
        status: testUser.status,
      },
    });
  }).timeout(10000);

  /**
   * patchSchool fail validation
   */
  it('should patchSchool fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    const patchReq = {
      add: {
        ...testUser,
      },
    };

    // call
    let res = await UsersService.patchSchool(testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "add.id" is not allowed');
  }).timeout(10000);

  /**
   * patchSchool fail get
   */
  it('should patchSchool fail get', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    const patchReq = {
      add: {
        schools: _.cloneDeep(testUser.schools),
      },
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.get called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await UsersService.patchSchool(testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * patchSchool fail references
   */
  it('should patchSchool fail references', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    const patchReq = {
      add: {
        schools: _.cloneDeep(testUser.schools),
      },
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await UsersService.patchSchool(testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * patchSchool fail patch
   */
  it('should patchSchool fail patch', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    const patchReq = {
      add: {
        schools: _.cloneDeep(testUser.schools),
      },
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.get called`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubPopulateReferences = sinon.stub(ReferencesUtils, 'populateReferences').callsFake(() => {
      return { status: 200, value: true };
    });

    let stubBase = sinon.stub(DbOpsUtils, 'patch').callsFake((config, objID, patchObj) => {
      console.log(`\nDbOpsUtils.patch called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await UsersService.patchSchool(testUser.id, patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubPopulateReferences.callCount).to.equal(1);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);
});
