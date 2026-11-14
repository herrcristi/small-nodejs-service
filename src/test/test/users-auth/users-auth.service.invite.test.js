const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthSignupService = require('../../../services/users-auth/users-auth.signup.service.js');
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
   * route invite wrapper calls through the signup invitation flow
   */
  it('routes invite wrapper calls through the signup invitation flow', async () => {
    const inviteInfo = { email: 'admin@example.test', school: { role: 'admin' } };
    const expected = { status: 201, value: { userID: 'user-id' } };
    const stubInvite = sinon.stub(UsersAuthSignupService, 'invite').resolves(expected);

    const result = await UsersAuthService.invite(inviteInfo, _ctx);

    chai.expect(stubInvite.calledOnceWithExactly(inviteInfo, _ctx)).to.equal(true);
    chai.expect(result).to.deep.equal(expected);
  });

  /**
   * send invite with success
   */
  it('should send invite with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const postReq = {
      username: testUser.id,
    };

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubEmail = sinon.stub(EmailsUtils, 'sendEmail').callsFake(() => {
      console.log(`\nEmailsUtils.sendEmail called`);
    });

    // call
    let res = await UsersAuthService.sendInvite(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubEmail.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        username: testUser.id,
        type: testUser.type,
      },
    });
  }).timeout(10000);

  /**
   * send invite fail validation
   */
  it('should send invite fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const postReq = {
      username: testUser.id,
      extra: 1,
    };

    // call
    let res = await UsersAuthService.sendInvite(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "extra" is not allowed');
  }).timeout(10000);
});
