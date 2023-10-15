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
   * getNotificationSchema with success
   */
  it('should call getNotificationSchema with success', async () => {
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

    // call
    let schema = NotificationsUtils.getNotificationSchema();
    let res = schema.validate(notification);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * getNotificationSchema not valid schema
   */
  it('should call getNotificationSchema and validate with not valid data - no service name', async () => {
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
    let schema = NotificationsUtils.getNotificationSchema();
    let res = schema.validate(notification);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.error.details[0].message).to.include('"serviceName" is required');
  }).timeout(10000);

  /**
   * getNotificationSchema not valid
   */
  it('should call getNotificationSchema with not valid data - no id', async () => {
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
    let schema = NotificationsUtils.getNotificationSchema();
    let res = schema.validate(notification);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.error.details[0].message).to.include('"added[0].id" is required');
  }).timeout(10000);

  /**
   * getNotificationSchema not valid
   */
  it('should call getNotificationSchema with not valid data - no extra', async () => {
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
    let schema = NotificationsUtils.getNotificationSchema();
    let res = schema.validate(notification);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);
});
