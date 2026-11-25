const crypto = require('crypto');
const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');
const JwtUtils = require('../../../core/utils/jwt.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const UsersLocalAuthService = require('../../../services/users-auth/users-local-auth.service.js');
const UsersAuthSessionsService = require('../../../services/users-auth/users-auth.sessions.service.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * a reset token as resetPassword makes it: the purpose, the user, and the secret of its link
   */
  const getResetToken = (testUser, purpose = 'reset-password', secret = 'secret1') => {
    const data = { purpose, username: testUser.id, userID: testUser.userID, secret };
    const rT = JwtUtils.getJwt(data, `${UsersAuthConstants.ServiceName}-local`, _ctx, 3600);
    return JwtUtils.encrypt(rT.value, UsersAuthConstants.ServiceName, _ctx).value; // double encryption
  };

  /**
   * stub the sessions service: the link is valid, it is used, the records of the user are ended
   */
  const stubLink = (testUser) => {
    const link = { id: 'link1', purpose: 'reset-password', userID: testUser.userID, username: testUser.id };
    return {
      check: sinon.stub(UsersAuthSessionsService, 'check').resolves({ status: 200, value: link }),
      end: sinon.stub(UsersAuthSessionsService, 'end').resolves({ status: 200, value: { id: 'link1' } }),
      endAll: sinon.stub(UsersAuthSessionsService, 'endAll').resolves({ status: 200, value: 2 }),
    };
  };

  /**
   * putResetPassword with success
   */
  it('should putResetPassword with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // a reset token (as resetPassword makes it), and its valid link
    let token = getResetToken(testUser);
    const stubs = stubLink(testUser);

    const putReq = {
      password: testUser._test_data.origPassword + 'aA1!',
    };

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, objInfo) => {
      console.log(`\nDbOpsUtils.put called ${JSON.stringify({ objID, objInfo }, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubUsersAuthRest = sinon.stub(UsersAuthRest, 'raiseNotification').callsFake((notificationType, objs) => {
      console.log(`\nUsersAuthRest raiseNotification called`);
      console.log(`\nNotificationType: ${JSON.stringify(notificationType, null, 2)}`);
      console.log(`\nNotifications: ${JSON.stringify(objs, null, 2)}`);

      chai.expect(notificationType).to.equal(NotificationsUtils.Constants.Notification.Modified);
      chai.expect(objs).to.deep.equal([
        {
          id: testUser.id,
          name: testUser.id,
          type: UsersAuthConstants.Type,
        },
      ]);
    });

    // call
    let res = await UsersAuthService.putResetPassword(token, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the password is set, the link is used, all the sessions and links of the user are ended
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubBase.firstCall.args[2]).to.have.keys(['salt', 'password']);
    chai.expect(stubs.end.firstCall.args[0]).to.equal('link1');
    chai.expect(stubs.endAll.firstCall.args[0]).to.equal(testUser.userID);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubUsersAuthRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        username: testUser.id,
        type: testUser.type,
      },
    });
  }).timeout(10000);

  /**
   * a link is used once: when it was used in the meantime (also by a request at the same time) it is refused
   */
  it('should putResetPassword refuse a link that was used in the meantime', async () => {
    // stub: the link is valid, but its record is already removed when it is used; no write is expected
    const testUser = _.cloneDeep(TestConstants.UsersAuth)[0];
    const stubs = stubLink(testUser);
    stubs.end.resolves({ status: 404, error: { message: 'Not found link1' } });
    const stubPut = sinon.stub(DbOpsUtils, 'put');

    // call
    const putReq = { password: testUser._test_data.origPassword + 'aA1!' };
    let res = await UsersAuthService.putResetPassword(getResetToken(testUser), putReq, _ctx);

    // check: refused, the password is not set
    chai.expect(res.status).to.equal(401);
    chai.expect(res.error.message).to.equal('The link is not valid anymore');
    chai.expect(stubPut.callCount).to.equal(0);

    // the database fails when the link is used: the real error, the password is not set
    stubs.end.resolves({ status: 500, error: { message: 'Test error message' } });
    res = await UsersAuthService.putResetPassword(getResetToken(testUser), putReq, _ctx);
    chai.expect(res.status).to.equal(500);
    chai.expect(stubPut.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * the sessions of the user can not be ended after the new password: the error is returned
   */
  it('should putResetPassword fail when the sessions can not be ended', async () => {
    // stub: a valid link, the write; ending the sessions fails
    const testUser = _.cloneDeep(TestConstants.UsersAuth)[0];
    const stubs = stubLink(testUser);
    stubs.endAll.resolves({ status: 500, error: { message: 'Test error message' } });
    sinon.stub(DbOpsUtils, 'put').returns({ status: 200, value: { ...testUser } });
    const stubEvent = sinon.stub(EventsRest, 'raiseEventForObject');

    // call
    const putReq = { password: testUser._test_data.origPassword + 'aA1!' };
    const res = await UsersAuthService.putResetPassword(getResetToken(testUser), putReq, _ctx);

    // check: the error, no event
    chai.expect(res.status).to.equal(500);
    chai.expect(stubEvent.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * a missing reset token is refused before anything is read
   */
  it('should putResetPassword fail without a token', async () => {
    // stub: nothing is read
    const testUser = _.cloneDeep(TestConstants.UsersAuth)[0];
    const stubs = stubLink(testUser);

    // call without a token
    const putReq = { password: testUser._test_data.origPassword + 'aA1!' };
    const res = await UsersAuthService.putResetPassword(undefined, putReq, _ctx);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubs.check.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * putResetPassword fail validation
   */
  it('should putResetPassword fail validation', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    const putReq = {
      password: testUser._test_data.origPassword + 'aA1!',
      extra: 1,
    };

    // call
    let res = await UsersAuthService.putResetPassword('token', putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.equal('Failed to validate schema. Error: "extra" is not allowed');
  }).timeout(10000);

  /**
   * putResetPassword with success
   */
  it('should putResetPassword with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    let token = 'token-invalid';

    const putReq = {
      password: testUser._test_data.origPassword + 'aA1!',
    };

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, objInfo) => {
      console.log(`\nDbOpsUtils.put called ${JSON.stringify({ objID, objInfo }, null, 2)}`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubUsersAuthRest = sinon.stub(UsersAuthRest, 'raiseNotification').callsFake((notificationType, objs) => {
      console.log(`\nUsersAuthRest raiseNotification called`);
    });

    // call
    let res = await UsersAuthService.putResetPassword(token, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(0);
    chai.expect(stubEvent.callCount).to.equal(0);
    chai.expect(stubUsersAuthRest.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Cannot decrypt data',
        error: new Error('Cannot decrypt data'),
      },
    });
  }).timeout(10000);

  /**
   * putResetPassword fail put
   */
  it('should putResetPassword fail put', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // a reset token (as resetPassword makes it), and its valid link
    let token = getResetToken(testUser);
    const stubs = stubLink(testUser);

    const putReq = {
      password: testUser._test_data.origPassword + 'aA1!',
    };

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'put').callsFake((config, objID, objInfo) => {
      console.log(`\nDbOpsUtils.put called ${JSON.stringify({ objID, objInfo }, null, 2)}`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubUsersAuthRest = sinon.stub(UsersAuthRest, 'raiseNotification').callsFake((notificationType, objs) => {
      console.log(`\nUsersAuthRest raiseNotification called`);
    });

    // call
    let res = await UsersAuthService.putResetPassword(token, putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the sessions are not ended (the password did not change)
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubs.endAll.callCount).to.equal(0);
    chai.expect(stubEvent.callCount).to.equal(0);
    chai.expect(stubUsersAuthRest.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Test error message', error: new Error('Test error') },
    });
  }).timeout(10000);

  /**
   * the link of an invitation sets up the account: the first password, the profile of the user (its own) and the
   * agreements it accepted; the link of a reset does not (refused before the link is used), the profile and the
   * agreements (all of them, in their current versions) are required and checked first, and a reset does not take a
   * profile
   */
  it('should putSetupAccount with the link of an invitation', async () => {
    const testUser = _.cloneDeep(TestConstants.UsersAuth)[0];
    const password = testUser._test_data.origPassword + 'aA1!';
    const profile = { name: 'Jane Smith', birthday: '1990-05-01T00:00:00.000Z', language: 'ro' };
    // the versions of the agreements that the user read and accepted (all the checkboxes)
    const agreements = _.mapValues(UsersAuthConstants.Agreements, (agreement) => agreement.version);

    // stub: the link of an invitation, the password, the profile
    const link = { id: 'link1', purpose: 'signup', userID: testUser.userID, username: testUser.id };
    sinon.stub(UsersAuthSessionsService, 'check').resolves({ status: 200, value: link });
    const stubEnd = sinon.stub(UsersAuthSessionsService, 'end').resolves({ status: 200, value: { id: 'link1' } });
    sinon.stub(UsersAuthSessionsService, 'endAll').resolves({ status: 200, value: 1 });
    sinon.stub(DbOpsUtils, 'put').resolves({ status: 200, value: { ...testUser } });
    const stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').resolves();
    sinon.stub(UsersAuthRest, 'raiseNotification').resolves();
    const stubProfile = sinon.stub(UsersRest, 'put').resolves({ status: 200, value: { id: testUser.userID } });
    const stubAgreements = sinon.stub(UsersRest, 'putAgreements').resolves({ status: 200, value: {} });
    const setupToken = getResetToken(testUser, 'signup');

    // call
    const res = await UsersAuthService.putSetupAccount(setupToken, { password, profile, agreements }, { ..._ctx });

    // check: the password and the profile of the user of the link (its own: the user of the request), its event
    chai.expect(res).to.deep.equal({ status: 200, value: { username: testUser.id, type: UsersAuthConstants.Type } });
    chai.expect(stubProfile.firstCall.args.slice(0, 2)).to.deep.equal([testUser.userID, profile]);
    chai.expect(stubProfile.firstCall.args[2].userID).to.equal(testUser.userID);
    chai.expect(stubEvent.firstCall.args[1]).to.equal('setupAccount');

    // check: the agreements are kept on the user, each with its version and when it was accepted
    chai.expect(stubAgreements.callCount).to.equal(1);
    chai.expect(stubAgreements.firstCall.args[0]).to.equal(testUser.userID);
    const saved = stubAgreements.firstCall.args[1].agreements;
    chai.expect(_.mapValues(saved, (agreement) => agreement.version)).to.deep.equal(agreements);
    for (const agreement of Object.values(saved)) {
      chai.expect(new Date(agreement.acceptedAt).toISOString()).to.equal(agreement.acceptedAt);
    }

    // case: the profile can not be saved
    stubProfile.resolves({ status: 500, error: { message: 'Database failure' } });
    const resFail = await UsersAuthService.putSetupAccount(setupToken, { password, profile, agreements }, { ..._ctx });
    chai.expect(resFail.status).to.equal(500);
    stubProfile.resolves({ status: 200, value: { id: testUser.userID } });

    // case: the agreements can not be saved
    stubAgreements.resolves({ status: 500, error: { message: 'Database failure' } });
    const resFailAgreements = await UsersAuthService.putSetupAccount(
      setupToken,
      { password, profile, agreements },
      { ..._ctx }
    );
    chai.expect(resFailAgreements.status).to.equal(500);

    // case: the agreements are missing, one is not accepted, or one is an older version (a document changed after it
    // was read): refused before the link is used
    stubEnd.resetHistory();
    const cases = [
      { agreements: undefined, status: 400 },
      { agreements: _.omit(agreements, 'privacy'), status: 400 },
      { agreements: { ...agreements, terms: '2000-01-01' }, status: 409 },
    ];
    for (const item of cases) {
      const resCase = await UsersAuthService.putSetupAccount(
        setupToken,
        { password, profile, agreements: item.agreements },
        { ..._ctx }
      );
      chai.expect(resCase.status, JSON.stringify(item.agreements)).to.equal(item.status);
    }
    chai.expect(stubEnd.callCount).to.equal(0);

    // case: the link of a reset: refused before the link is used
    link.purpose = 'reset-password';
    stubEnd.resetHistory();
    const resReset = await UsersAuthService.putSetupAccount(
      getResetToken(testUser),
      { password, profile, agreements },
      { ..._ctx }
    );
    chai.expect(resReset.status).to.equal(401);
    chai.expect(stubEnd.callCount).to.equal(0);

    // case: a profile that is not valid, or none (a new user has no name yet: it is required)
    for (const wrong of [{ name: 'Jane', language: 'fr' }, { name: 'Jane', birthday: 'yesterday' }, {}, undefined]) {
      const resWrong = await UsersAuthService.putSetupAccount(
        setupToken,
        { password, profile: wrong, agreements },
        { ..._ctx }
      );
      chai.expect(resWrong.status, JSON.stringify(wrong)).to.equal(400);
    }
    chai.expect(stubEnd.callCount).to.equal(0);

    // case: a reset does not take a profile
    const resProfile = await UsersAuthService.putResetPassword(
      getResetToken(testUser),
      { password, profile },
      {
        ..._ctx,
      }
    );
    chai.expect(resProfile.status).to.equal(400);
  }).timeout(10000);
});
