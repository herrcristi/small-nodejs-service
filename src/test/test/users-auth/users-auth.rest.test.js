const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const RestCommsUtils = require('../../../core/utils/rest-communications.utils.js');
const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthSignupService = require('../../../services/users-auth/users-auth.signup.service.js');
const UsersAuthLocal = require('../../../services/users-auth/users-auth.local.js');

describe('Users Auth Rest', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * rest login
   */
  it('should call login via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'call').callsFake(() => {
      console.log(`\nRestCommUtils.call called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.login({ email: 'email', pass: 'pass' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest logout
   */
  it('should call logout via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'call').callsFake(() => {
      console.log(`\nRestCommUtils.call called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.logout(_ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest signup
   */
  it('should call signup via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'call').callsFake(() => {
      console.log(`\nRestCommUtils.call called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.signup({ email: 'email' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest invite
   */
  it('should call invite via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'call').callsFake(() => {
      console.log(`\nRestCommUtils.call called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.invite({ email: 'email', school: { role: 'admin' } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * local calls of signup + invite reach the signup service (the same flow as the public routes)
   */
  it('should route local signup and invite calls to the signup service', async () => {
    const stubSignup = sinon.stub(UsersAuthSignupService, 'signup').resolves({ status: 201, value: 'signup' });
    const stubInvite = sinon.stub(UsersAuthSignupService, 'invite').resolves({ status: 201, value: 'invite' });

    // UsersAuthRest.invite / signup use localCall { fn: 'invite' | 'signup' } on the users-auth local service
    const inviteInfo = { email: 'email', school: { role: 'admin' } };
    chai.expect((await UsersAuthLocal.invite(inviteInfo, _ctx)).value).to.equal('invite');
    chai.expect((await UsersAuthLocal.signup({ email: 'email' }, _ctx)).value).to.equal('signup');
    chai.expect(stubInvite.calledOnceWithExactly(inviteInfo, _ctx)).to.equal(true);
    chai.expect(stubSignup.calledOnce).to.equal(true);

    // the other users-auth functions still come from the users-auth service
    chai.expect(UsersAuthLocal.login).to.equal(UsersAuthService.login);
    chai.expect(UsersAuthLocal.sendInvite).to.equal(UsersAuthService.sendInvite);
  }).timeout(10000);

  /**
   * rest validate
   */
  it('should call validate via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'validate').callsFake(() => {
      console.log(`\nRestCommUtils.validate called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.validate({ token: 'token' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest post
   */
  it('should post a call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'call').callsFake((config) => {
      console.log(`\nRestCommUtils.call called with ${JSON.stringify(config)}\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.post({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest delete
   */
  it('should delete a call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'call').callsFake((config) => {
      console.log(`\nRestCommUtils.call called with ${JSON.stringify(config)}\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.delete('id1', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest put password
   */
  it('should put password call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'call').callsFake((config) => {
      console.log(`\nRestCommUtils.call called with ${JSON.stringify(config)}\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.putPassword('id1', {}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest put id
   */
  it('should put id call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'call').callsFake((config) => {
      console.log(`\nRestCommUtils.call called with ${JSON.stringify(config)}\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.putID('id1', {}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest patch password
   */
  it('should patch password call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'call').callsFake((config) => {
      console.log(`\nRestCommUtils.call called with ${JSON.stringify(config)}\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.patchPassword('id1', {}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest patch id
   */
  it('should patch id call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'call').callsFake((config) => {
      console.log(`\nRestCommUtils.call called with ${JSON.stringify(config)}\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.patchID('id1', {}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest patch user school
   */
  it('should patch user school call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'call').callsFake((config) => {
      console.log(`\nRestCommUtils.call called with ${JSON.stringify(config)}\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.patchUserSchool('id1', 'userID', {}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest notification
   */
  it('should do notification a call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'notification').callsFake(() => {
      console.log(`\nRestCommUtils.notification called\n`);
      return { status: 200, value: true };
    });

    // call
    let res = await UsersAuthRest.notification({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal(true);
  }).timeout(10000);

  /**
   * subscribe
   */
  it('should do subscribe', async () => {
    // call
    let res = await UsersAuthRest.subscribe({ callback: null, projection: { id: 1 } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check

    chai.expect(res?.value).to.equal(true);
  }).timeout(10000);

  /**
   * consume
   */
  it('should do consume', async () => {
    // stub
    let stub = sinon.stub(NotificationsUtils, 'consume').callsFake(() => {
      console.log(`\nNotificationsUtils.consume called\n`);
      return { status: 200, value: true };
    });

    // call
    let res = await UsersAuthRest.consume({ callback: null, projection: { id: 1 } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal(true);
  }).timeout(10000);

  /**
   * raiseNotification
   */
  it('should do raiseNotification', async () => {
    // stub
    let stub = sinon.stub(NotificationsUtils, 'raiseNotification').callsFake(() => {
      console.log(`\nNotificationsUtils.raiseNotification called\n`);
      return { status: 200, value: true };
    });

    // call
    let res = await UsersAuthRest.raiseNotification(
      NotificationsUtils.Constants.Notification.Added,
      [{ id: 'id1' }],
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal(true);
  }).timeout(10000);
});
