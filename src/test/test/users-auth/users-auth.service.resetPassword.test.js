const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthServiceLocal = require('../../../services/users-auth/users-local-auth.service.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthSessionsService = require('../../../services/users-auth/users-auth.sessions.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const EmailsUtils = require('../../../core/utils/emails.utils.js');
const JwtUtils = require('../../../core/utils/jwt.utils.js');
const UsersAuthServiceFirebase = require('../../../services/users-auth/users-firebase-auth.service.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {
    // the sessions and the emailed links (their own collection): a new one, and all the ones of the user ended
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const link = { id: 'session-hash1', secret: 'secret1', expiresAt };
    sinon.stub(UsersAuthSessionsService, 'create').resolves({ status: 201, value: link });
    sinon.stub(UsersAuthSessionsService, 'endAll').resolves({ status: 200, value: 1 });
    // no email of the same type was sent to the user less than EmailInterval ago: it can be sent now
    sinon.stub(UsersAuthServiceLocal, 'putEmailTimestamp').resolves({ status: 200, value: {} });
  });

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
      username: testUser.id,
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

    // the reset email is sent without waiting for it (the time of the answer must not tell if the account exists)
    await new Promise((resolve) => setTimeout(resolve, 20));

    // check: sent (the answer does not wait for the delivery)
    chai.expect(stubGet.callCount).to.equal(1);
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
   * resetPassword again less than EmailInterval after the last one (a repeated click, a flood of the public form): no
   * new link (the link sent before stays the valid one), no email, the same answer
   */
  it('should resetPassword not again within the email interval', async () => {
    const testUser = _.cloneDeep(TestConstants.UsersAuth[0]);

    // stub: a reset email was sent to the user less than EmailInterval ago
    UsersAuthServiceLocal.putEmailTimestamp.resolves({
      status: 409,
      error: { message: 'Not matched', error: new Error('Not matched') },
    });
    const stubGet = sinon.stub(DbOpsUtils, 'getOne');
    const stubEvent = sinon.stub(EventsRest, 'raiseEventForObject');
    const stubEmail = sinon.stub(EmailsUtils, 'sendEmail');
    const spyLog = sinon.spy(console, 'log');

    // call
    const res = await UsersAuthService.resetPassword({ username: testUser.id }, _ctx);
    await new Promise((resolve) => setTimeout(resolve, 20));
    spyLog.restore();

    // check: the logs of the public form name neither the address nor the kind of email
    const logs = spyLog.args.map((args) => args.join(' ')).join('\n');
    chai.expect(logs).to.include('the email is not sent now (status 409)');
    chai.expect(logs).to.not.include(testUser.id);
    chai.expect(logs).to.not.include(UsersAuthConstants.ResetTokenType.ResetPassword);

    // check: the time of the reset email of this user was checked, nothing else done
    chai.expect(UsersAuthServiceLocal.putEmailTimestamp.args[0][1]).to.equal(testUser.id);
    chai
      .expect(UsersAuthServiceLocal.putEmailTimestamp.args[0][2])
      .to.equal(UsersAuthConstants.ResetTokenType.ResetPassword);
    chai.expect(stubGet.callCount).to.equal(0);
    chai.expect(UsersAuthSessionsService.create.callCount).to.equal(0);
    chai.expect(stubEmail.callCount).to.equal(0);
    chai.expect(stubEvent.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({ status: 200, value: { username: testUser.id, type: testUser.type } });
  }).timeout(10000);

  /**
   * resetPassword fail validation
   */
  it('should resetPassword fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const postReq = {
      username: testUser.id,
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
      username: testUser.id,
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
   * resetPassword for a signup link (sent by an invite): sent like a reset link
   */
  it('should resetPassword with success for a signup link', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const postReq = {
      username: testUser.id,
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
    let res = await UsersAuthService.resetPassword(postReq, _ctx, UsersAuthConstants.ResetTokenType.Signup);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // the email is sent without waiting for it
    await new Promise((resolve) => setTimeout(resolve, 20));

    // check
    chai.expect(stubGet.callCount).to.equal(1);
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
   * resetPassword with the firebase provider does not send the token email (firebase sends it)
   */
  it('should resetPassword with the firebase provider without sending the email', async () => {
    const testUser = _.cloneDeep(TestConstants.UsersAuth[0]);
    const authProviderType = process.env.SMALL_API_AUTH_PROVIDER_TYPE;

    // switch the provider to firebase
    sinon.stub(JwtUtils, 'init');
    sinon.stub(EmailsUtils, 'init');
    sinon.stub(UsersAuthServiceFirebase, 'init').resolves();
    process.env.SMALL_API_AUTH_PROVIDER_TYPE = 'firebase';
    await UsersAuthService.init();

    try {
      sinon.stub(UsersAuthServiceFirebase, 'putEmailTimestamp').resolves({ status: 200, value: {} });
      const stubFirebase = sinon.stub(UsersAuthServiceFirebase, 'resetPassword').resolves({ status: 200, value: {} });
      const stubEvent = sinon.stub(EventsRest, 'raiseEventForObject');
      const stubEmail = sinon.stub(EmailsUtils, 'sendEmail');

      const res = await UsersAuthService.resetPassword({ username: testUser.id }, _ctx);

      chai.expect(stubFirebase.callCount).to.equal(1);
      chai.expect(stubEmail.callCount).to.equal(0);
      chai.expect(stubEvent.callCount).to.equal(1);
      chai.expect(res).to.deep.equal({
        status: 200,
        value: { username: testUser.id, type: testUser.type },
      });
    } finally {
      // back to the provider of the other tests
      process.env.SMALL_API_AUTH_PROVIDER_TYPE = authProviderType;
      await UsersAuthService.init();
    }
  }).timeout(10000);
});
