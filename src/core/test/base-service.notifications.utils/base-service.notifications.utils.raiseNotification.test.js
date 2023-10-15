const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const Joi = require('joi');

const ReferencesUtils = require('../../utils/base-service.references.utils.js');
const NotificationsUtils = require('../../utils/base-service.notifications.utils.js');
const DbOpsUtils = require('../../utils/db-ops.utils.js');

describe('Base Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  const config = {
    serviceName: 'service',
    collection: 'collection',
    references: [{ fieldName: 'target', service: { getAllByIDs: () => {} }, projection: null /*default*/ }],
    fillReferences: false,
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    delete config.subscribers;
    sinon.restore();
  });

  after(async function () {});

  /**
   * raiseNotification with success
   */
  it('should call raiseNotification with success', async () => {
    const objs = [
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
    ];

    let fnNotificationSuccess = false;
    config.subscribers = [
      {
        callback: sinon.stub().callsFake((notification) => {
          console.log(`\nSubscriber callback called with ${JSON.stringify(notification, null, 2)}\n`);
          chai.expect(notification).to.deep.equal({
            serviceName: 'service',
            added: [
              {
                id: 'id4',
              },
            ],
          });

          fnNotificationSuccess = true;
        }),
        projection: { id: 1 },
      },
    ];

    // call
    let res = await NotificationsUtils.raiseNotification(
      config,
      NotificationsUtils.Constants.Notification.Added,
      objs,
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(fnNotificationSuccess).to.equal(true);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * raiseNotification with no subscribers
   */
  it('should call raiseNotification with no subscribers', async () => {
    const objs = [
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
    ];

    // call
    let res = await NotificationsUtils.raiseNotification(
      config,
      NotificationsUtils.Constants.Notification.Added,
      objs,
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * raiseNotification with success and default projection
   */
  it('should call raiseNotification with success and default projection', async () => {
    const objs = [
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
    ];

    let fnNotificationSuccess = false;
    config.subscribers = [
      {
        callback: sinon.stub().callsFake((notification) => {
          console.log(`\nSubscriber callback called with ${JSON.stringify(notification, null, 2)}\n`);
          chai.expect(notification).to.deep.equal({
            serviceName: 'service',
            added: [
              {
                id: 'id4',
                name: 'name4',
              },
            ],
          });

          fnNotificationSuccess = true;
        }),
      },
    ];

    // call
    let res = await NotificationsUtils.raiseNotification(
      config,
      NotificationsUtils.Constants.Notification.Added,
      objs,
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(fnNotificationSuccess).to.equal(true);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * raiseNotification with success and no callback
   */
  it('should call raiseNotification with success and no callback', async () => {
    const objs = [
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
    ];

    config.subscribers = [{}];

    // call
    let res = await NotificationsUtils.raiseNotification(
      config,
      NotificationsUtils.Constants.Notification.Added,
      objs,
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * raiseNotification with exception
   */
  it('should call raiseNotification with exception', async () => {
    const objs = [
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
    ];

    config.subscribers = [
      {
        callback: sinon.stub().callsFake((notification) => {
          throw new Error('Test error');
        }),
      },
    ];

    // call
    let res = await NotificationsUtils.raiseNotification(
      config,
      NotificationsUtils.Constants.Notification.Added,
      objs,
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    // even if callback failes the functions still succeeds
    chai.expect(config.subscribers[0].callback.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);
});
