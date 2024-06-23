const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const EmailsUtils = require('../../../core/utils/emails.utils.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * resetPassword with success
   */
  it('should resetPassword with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const postReq = {
      id: testUser.id,
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubEmail = sinon.stub(EmailsUtils, 'sendEmail').callsFake(() => {
      console.log(`\nEmailsUtils.sendEmail called`);
    });

    // call
    let res = await UsersAuthService.resetPassword(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubEmail.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testUser.id,
        name: testUser.id,
        type: testUser.type,
      },
    });
  }).timeout(10000);

  /**
   * resetPassword fail validation
   */
  it('should resetPassword fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const postReq = {
      id: testUser.id,
      extra: 1,
    };

    // call
    let res = await UsersAuthService.resetPassword(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "extra" is not allowed');
  }).timeout(10000);

  /**
   * resetPassword fail get
   */
  it('should resetPassword fail get', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const postReq = {
      id: testUser.id,
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersAuthService.resetPassword(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error') },
    });
  }).timeout(10000);

  /**
   * resetPassword with success for type invite
   */
  it('should resetPassword with success for type invite', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const postReq = {
      id: testUser.id,
    };

    // stub
    let stubGet = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called ${JSON.stringify(objID, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubEmail = sinon.stub(EmailsUtils, 'sendEmail').callsFake(() => {
      console.log(`\nEmailsUtils.sendEmail called`);
    });

    // call
    let res = await UsersAuthService.resetPassword(postReq, _ctx, UsersAuthConstants.ResetTokenType.Invite);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubGet.callCount).to.equal(1);
    chai.expect(stubEmail.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testUser.id,
        name: testUser.id,
        type: testUser.type,
      },
    });
  }).timeout(10000);
});
