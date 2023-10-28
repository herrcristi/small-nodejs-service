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
const UsersRest = require('../../../services/rest/users.rest.js');

describe('Users Rest', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * rest getAll
   */
  it('should call getAll via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'getAll').callsFake(() => {
      console.log(`\nRestCommUtils.getAll called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersRest.getAll('?', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest getAllByIDs
   */
  it('should call getAllByIDs via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'getAllByIDs').callsFake(() => {
      console.log(`\nRestCommUtils.getAllByIDs  called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersRest.getAllByIDs(['id1'], { id: 1, name: 1 } /*projection*/, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest getOne
   */
  it('should call getOne via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'getOne').callsFake(() => {
      console.log(`\nRestCommUtils.getOne  called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersRest.getOne('id1', _ctx);
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
    let res = await UsersRest.post({}, _ctx);
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
    let res = await UsersRest.delete('id1', _ctx);
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
    let res = await UsersRest.put('id1', {}, _ctx);
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
    let res = await UsersRest.patch('id1', {}, _ctx);
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
    let res = await UsersRest.notification({}, _ctx);
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
    let res = await UsersRest.subscribe({ callback: null, projection: { id: 1 } }, _ctx);
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
    let res = await UsersRest.consume({ callback: null, projection: { id: 1 } }, _ctx);
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
    let res = await UsersRest.raiseNotification(NotificationsUtils.Constants.Notification.Added, [{ id: 'id1' }], _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res?.value).to.equal(true);
  }).timeout(10000);

  /**
   * filterNotificationByRole for student
   */
  it('should do filterNotificationByRole for student', async () => {
    const notification = _.cloneDeep(TestConstants.UsersNotifications[0]);

    // call
    let res = UsersRest.filterNotificationByRole(notification, 'student', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      serviceName: 'users',
      added: [],
      modified: [
        {
          id: 'user1',
          name: 'Big Ben',
          type: 'user',
          status: 'active',
          schools: [
            {
              id: 'school-univ1',
              roles: ['student'],
            },
          ],
        },
      ],
      removed: [],
    });
  }).timeout(10000);

  /**
   * filterNotificationByRole for teacher
   */
  it('should do filterNotificationByRole for teacher', async () => {
    const notification = _.cloneDeep(TestConstants.UsersNotifications[0]);

    // call
    let res = UsersRest.filterNotificationByRole(notification, 'teacher', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      serviceName: 'users',
      added: [],
      modified: [
        {
          id: 'user1',
          name: 'Big Ben',
          type: 'user',
          status: 'active',
          schools: [
            {
              id: 'school-high2',
              roles: ['teacher'],
            },
          ],
        },
      ],
      removed: [],
    });
  }).timeout(10000);

  /**
   * filterNotificationByRole for admin
   */
  it('should do filterNotificationByRole for admin', async () => {
    const notification = _.cloneDeep(TestConstants.UsersNotifications[0]);

    // call
    let res = UsersRest.filterNotificationByRole(notification, 'admin', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      serviceName: 'users',
      added: [],
      modified: [
        {
          id: 'user1',
          name: 'Big Ben',
          type: 'user',
          status: 'active',
          schools: [
            {
              id: 'school-high2',
              roles: ['admin'],
            },
          ],
        },
      ],
      removed: [],
    });
  }).timeout(10000);

  /**
   * filterNotificationByRole for other
   */
  it('should do filterNotificationByRole for other', async () => {
    const notification = _.cloneDeep(TestConstants.UsersNotifications[0]);

    // call
    let res = UsersRest.filterNotificationByRole(notification, 'other', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      serviceName: 'users',
      added: [],
      modified: [],
      removed: [],
    });
  }).timeout(10000);

  /**
   * filterNotificationByRole no schools
   */
  it('should do filterNotificationByRole no schools', async () => {
    const notification = _.cloneDeep(TestConstants.UsersNotifications[0]);
    delete notification.modified[0].schools;

    // call
    let res = UsersRest.filterNotificationByRole(notification, 'student', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      serviceName: 'users',
      added: [],
      modified: [],
      removed: [],
    });
  }).timeout(10000);

  /**
   * filterNotificationByRole no roles
   */
  it('should do filterNotificationByRole no roles', async () => {
    const notification = _.cloneDeep(TestConstants.UsersNotifications[0]);
    delete notification.modified[0].schools[0].roles;

    // call
    let res = UsersRest.filterNotificationByRole(notification, 'student', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      serviceName: 'users',
      added: [],
      modified: [],
      removed: [],
    });
  }).timeout(10000);

  /**
   * convertToTenantNotifications
   */
  it('should do convertToTenantNotifications', async () => {
    const notification = _.cloneDeep(TestConstants.UsersNotifications[0]);

    // call
    let res = UsersRest.convertToTenantNotifications(notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal([
      {
        tenantID: 'school-univ1',
        notification: {
          serviceName: 'users',
          modified: [
            {
              id: 'user1',
              name: 'Big Ben',
              type: 'user',
              status: 'active',
              schools: [
                {
                  id: 'school-univ1',
                  roles: ['student'],
                },
              ],
            },
          ],
        },
      },
      {
        tenantID: 'school-high2',
        notification: {
          serviceName: 'users',
          modified: [
            {
              id: 'user1',
              name: 'Big Ben',
              type: 'user',
              status: 'active',
              schools: [
                {
                  id: 'school-high2',
                  roles: ['teacher', 'admin'],
                },
              ],
            },
          ],
        },
      },
    ]);
  }).timeout(10000);

  /**
   * convertToTenantNotifications + filterNotificationByRole
   */
  it('should do convertToTenantNotifications + filterNotificationByRole', async () => {
    const notification = _.cloneDeep(TestConstants.UsersNotifications[0]);

    // call
    let res = UsersRest.convertToTenantNotifications(notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    for (const notif of res) {
      notif.notification = UsersRest.filterNotificationByRole(notif.notification, 'student', _ctx);
    }
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal([
      {
        tenantID: 'school-univ1',
        notification: {
          serviceName: 'users',
          added: [],
          modified: [
            {
              id: 'user1',
              name: 'Big Ben',
              type: 'user',
              status: 'active',
              schools: [
                {
                  id: 'school-univ1',
                  roles: ['student'],
                },
              ],
            },
          ],
          removed: [],
        },
      },
      {
        tenantID: 'school-high2',
        notification: {
          serviceName: 'users',
          added: [],
          modified: [],
          removed: [],
        },
      },
    ]);
  }).timeout(10000);

  /**
   * convertToTenantNotifications no schools
   */
  it('should do convertToTenantNotifications no schools', async () => {
    const notification = _.cloneDeep(TestConstants.UsersNotifications[0]);
    delete notification.modified[0].schools;

    // call
    let res = UsersRest.convertToTenantNotifications(notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal([]);
  }).timeout(10000);
});
