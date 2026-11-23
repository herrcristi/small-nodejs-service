const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
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
    let res = await UsersRest.getOne('id1', {}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest getOneByEmail
   */
  it('should call getOneByEmail via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'getAll').callsFake((serviceName, queryParams) => {
      console.log(
        `\nRestCommUtils.getAll called for ${serviceName} with query ${JSON.stringify(queryParams, null, 2)}\n`
      );
      chai.expect(queryParams).to.equal('email=email&limit=1&projection=id');
      return { status: 200, value: ['dummy'] };
    });

    // call: with the options of the read (the primary)
    const options = { readPreference: DbOpsUtils.Constants.ReadPrimary };
    let res = await UsersRest.getOneByEmail('email', { id: 1 }, _ctx, options);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the options go to the read
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(stub.firstCall.args[3]).to.deep.equal(options);
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest getOneByEmail looks up the normalized email (the emails are stored in lower case)
   */
  it('should call getOneByEmail with the normalized email', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'getAll').returns({
      status: 200,
      value: [{ id: 'user1', email: 'john.doe@testdomain.test' }],
    });

    // call
    let res = await UsersRest.getOneByEmail(' John.Doe@TestDomain.TEST', null, _ctx);

    // check
    chai.expect(stub.firstCall.args[1]).to.equal('email=john.doe%40testdomain.test&limit=1');
    chai.expect(res.value.id).to.equal('user1');
  }).timeout(10000);

  /**
   * rest getOneByEmail failed get and no projection
   */
  it('should call getOneByEmail failed get and no projection', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'getAll').callsFake((serviceName, queryParams) => {
      console.log(
        `\nRestCommUtils.getAll called for ${serviceName} with query ${JSON.stringify(queryParams, null, 2)}\n`
      );
      chai.expect(queryParams).to.equal('email=email&limit=1');
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await UsersRest.getOneByEmail('email', null, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai
      .expect(res)
      .to.deep.equal({ status: 500, error: { message: 'Test error message', error: new Error('Test error') } });
  }).timeout(10000);

  /**
   * rest getOneByEmail failed not found
   */
  it('should call getOneByEmail failed not found', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'getAll').callsFake((serviceName, queryParams) => {
      console.log(
        `\nRestCommUtils.getAll called for ${serviceName} with query ${JSON.stringify(queryParams, null, 2)}\n`
      );
      chai.expect(queryParams).to.equal('email=email&limit=1');
      return { status: 200, value: [], time: 0 };
    });

    // call
    let res = await UsersRest.getOneByEmail('email', null, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 404,
      error: { message: 'Not found email', error: new Error('Not found email') },
      time: 0,
    });
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
   * rest putEmail
   */
  it('should put email call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'put').callsFake(() => {
      console.log(`\nRestCommUtils.put called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersRest.putEmail('id1', {}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res?.value).to.equal('dummy');
  }).timeout(10000);

  /**
   * rest activate: an internal call (POST /:id/activate), the local function is activate
   */
  it('should activate call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'call').callsFake(() => {
      console.log(`\nRestCommUtils.call called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersRest.activate('id1', _ctx);

    // check
    chai.expect(stub.firstCall.args[0]).to.deep.equal({
      serviceName: 'users-internal',
      method: 'POST',
      path: '/id1/activate',
      body: {},
      localCall: { fn: 'activate', params: { objID: 'id1' } },
    });
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
   * rest patch school
   */
  it('should patch school call via rest', async () => {
    // stub
    let stub = sinon.stub(RestCommsUtils, 'patch').callsFake(() => {
      console.log(`\nRestCommUtils.patch called\n`);
      return { status: 200, value: 'dummy' };
    });

    // call
    let res = await UsersRest.patchSchool('id1', {}, _ctx);
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
      modified: [
        {
          id: 'user1',
          name: 'Big Ben',
          type: 'user',
          status: 'active',
          email: 'big.ben@testdomain.test',
          schools: [
            {
              id: 'school-high2',
              roles: ['admin'],
            },
          ],
        },
      ],
    });
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
      modified: [
        {
          id: 'user1',
          name: 'Big Ben',
          type: 'user',
          status: 'active',
          email: 'big.ben@testdomain.test',
          schools: [
            {
              id: 'school-univ1',
              roles: ['student'],
            },
          ],
        },
      ],
    });
  }).timeout(10000);

  /**
   * filterNotificationByRole for professor
   */
  it('should do filterNotificationByRole for professor', async () => {
    const notification = _.cloneDeep(TestConstants.UsersNotifications[0]);

    // call
    let res = UsersRest.filterNotificationByRole(notification, 'professor', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      serviceName: 'users',
      modified: [
        {
          id: 'user1',
          name: 'Big Ben',
          type: 'user',
          status: 'active',
          email: 'big.ben@testdomain.test',
          schools: [
            {
              id: 'school-high2',
              roles: ['professor'],
            },
          ],
        },
      ],
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
      modified: [
        {
          id: 'user1',
          name: 'Big Ben',
          type: 'user',
          status: 'active',
          email: 'big.ben@testdomain.test',
          schools: [
            {
              id: 'school-high2',
              roles: ['admin'],
            },
          ],
        },
      ],
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
              email: 'big.ben@testdomain.test',
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
              email: 'big.ben@testdomain.test',
              schools: [
                {
                  id: 'school-high2',
                  roles: ['professor', 'admin'],
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
          modified: [
            {
              id: 'user1',
              name: 'Big Ben',
              type: 'user',
              status: 'active',
              email: 'big.ben@testdomain.test',
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

  /**
   * rest getOneByEmail: the email is a value, it can not add or change filters
   */
  it('should call getOneByEmail with the email encoded as a single value', async () => {
    const queryLikeEmail = 'x&email=portal.admin%40example.test&sort=x@testdomain.test';
    let stub = sinon.stub(RestCommsUtils, 'getAll').callsFake((serviceName, queryParams) => {
      const parsed = new URLSearchParams(queryParams);
      // exactly one email parameter, with the whole text, and nothing else was added
      chai.expect(parsed.getAll('email')).to.deep.equal([queryLikeEmail]);
      chai.expect(parsed.has('sort')).to.equal(false);
      chai.expect([...parsed.keys()].sort()).to.deep.equal(['email', 'limit']);
      return { status: 200, value: [{ id: 'user1', email: queryLikeEmail }] };
    });

    let res = await UsersRest.getOneByEmail(queryLikeEmail, null, _ctx);

    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res.value.id).to.equal('user1');

    // a plus is a plus (not a space)
    stub.restore();
    stub = sinon.stub(RestCommsUtils, 'getAll').callsFake((serviceName, queryParams) => {
      chai.expect(new URLSearchParams(queryParams).get('email')).to.equal('john+tag@school.test');
      return { status: 200, value: [{ id: 'user2', email: 'john+tag@school.test' }] };
    });
    res = await UsersRest.getOneByEmail('john+tag@school.test', null, _ctx);
    chai.expect(res.value.id).to.equal('user2');
  }).timeout(10000);

  /**
   * rest getOneByEmail: the user that comes back must have exactly the requested email
   */
  it('should call getOneByEmail and refuse a user with another email', async () => {
    // stub
    sinon.stub(RestCommsUtils, 'getAll').callsFake(() => {
      return { status: 200, value: [{ id: 'portal-admin-id', email: 'portal.admin@example.test' }], time: 0 };
    });

    // call
    const res = await UsersRest.getOneByEmail('student@example.test', { id: 1, email: 1 }, _ctx);

    // check
    chai.expect(res.status).to.equal(404);
    chai.expect(res.error.message).to.equal('Not found student@example.test');
  }).timeout(10000);

  /**
   * the portal admins (internal, for the bootstrap)
   */
  it('should get the portal admins via rest', async () => {
    // stub: the call
    const stub = sinon.stub(RestCommsUtils, 'call').resolves({ status: 200, value: { data: [] } });

    // call
    const res = await UsersRest.getPortalAdmins('status=active&limit=1', _ctx);

    // check: the internal route with the query, the local function with the request
    chai.expect(res.value).to.deep.equal({ data: [] });
    chai
      .expect(stub.firstCall.args[0])
      .to.deep.include({ method: 'GET', path: '/portal-admins', query: 'status=active&limit=1' });
    chai.expect(stub.firstCall.args[0].localCall).to.deep.equal({
      fn: 'getPortalAdminsForReq',
      params: { req: { query: 'status=active&limit=1' } },
    });
  }).timeout(10000);
});
