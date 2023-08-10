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
    fillReferences: true,
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    config.fillReferences = true;
    sinon.restore();
  });

  after(async function () {});

  /**
   * notification with success
   */
  it('should call notification with success', async () => {
    const notification = {
      serviceName: 'service',
      added: [
        {
          id: 'id4',
          name: 'name4',
          target: [
            {
              id: 'targetID4',
            },
          ],
        },
      ],
    };

    let stubRef = sinon.stub(ReferencesUtils, 'onNotificationReferences').callsFake(() => {
      console.log(`\nReferencesUtils.onNotificationReferences called\n`);
      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await NotificationsUtils.notification(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubRef.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * notification skipped
   */
  it('should call notification and skip', async () => {
    const notification = {
      serviceName: 'service',
      added: [
        {
          id: 'id4',
          name: 'name4',
          target: [
            {
              id: 'targetID4',
            },
          ],
        },
      ],
    };

    let stubRef = sinon.stub(ReferencesUtils, 'onNotificationReferences').callsFake(() => {
      console.log(`\nReferencesUtils.onNotificationReferences called\n`);
      return {
        status: 200,
        value: true,
      };
    });

    // call
    config.fillReferences = false;
    let res = await NotificationsUtils.notification(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubRef.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: null,
    });
  }).timeout(10000);

  /**
   * notification not valid
   */
  it('should call notification with not valid data - no service name', async () => {
    const notification = {
      //serviceName: 'service',
      added: [
        {
          id: 'id4',
          name: 'name4',
          target: [
            {
              id: 'targetID4',
            },
          ],
        },
      ],
    };

    // call
    let res = await NotificationsUtils.notification(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('"serviceName" is required');
  }).timeout(10000);

  /**
   * notification not valid
   */
  it('should call notification with not valid data - no id', async () => {
    const notification = {
      serviceName: 'service',
      added: [
        {
          //id: 'id4',
          name: 'name4',
          target: [
            {
              id: 'targetID4',
            },
          ],
        },
      ],
    };

    // call
    let res = await NotificationsUtils.notification(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('"added[0].id" is required');
  }).timeout(10000);

  /**
   * notification not valid
   */
  it('should call notification with not valid data - no extra', async () => {
    const notification = {
      serviceName: 'service',
      extra: [
        {
          id: 'id4',
          name: 'name4',
          target: [
            {
              id: 'targetID4',
            },
          ],
        },
      ],
    };

    // call
    let res = await NotificationsUtils.notification(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('"extra" is not allowed');
  }).timeout(10000);
});
