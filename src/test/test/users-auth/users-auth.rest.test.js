const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const RestCommsUtils = require('../../../core/utils/rest-communications.utils.js');
const NotificationsUtils = require('../../../core/utils/base-service.notifications.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');

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
    let stub = sinon.stub(RestCommsUtils, 'login').callsFake(() => {
      console.log(`\nRestCommUtils.login called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.login({ email: 'email', pass: 'pass' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest logout
   */
  it('should call logout via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'logout').callsFake(() => {
      console.log(`\nRestCommUtils.logout called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.logout(_ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest signup
   */
  it('should call signup via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'signup').callsFake(() => {
      console.log(`\nRestCommUtils.signup called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.signup({ email: 'email' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest invite
   */
  it('should call invite via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'invite').callsFake(() => {
      console.log(`\nRestCommUtils.invite called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.invite({ email: 'email', school: { role: 'admin' } }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
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
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest post
   */
  it('should post a call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'post').callsFake(() => {
      console.log(`\nRestCommUtils.post called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.post({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest delete
   */
  it('should delete a call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'delete').callsFake(() => {
      console.log(`\nRestCommUtils.delete called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.delete('id1', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest put
   */
  it('should put a call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'put').callsFake(() => {
      console.log(`\nRestCommUtils.put called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.put('id1', {}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest patch
   */
  it('should patch a call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'patch').callsFake(() => {
      console.log(`\nRestCommUtils.patch called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersAuthRest.patch('id1', {}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
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
