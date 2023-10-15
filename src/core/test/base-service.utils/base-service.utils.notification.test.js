const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const Joi = require('joi');

const BaseServiceUtils = require('../../utils/base-service.utils.js');
const DbOpsUtils = require('../../utils/db-ops.utils.js');
const NotificationsUtils = require('../../utils/base-service.notifications.utils.js');

describe('Base Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  const config = {
    serviceName: 'service',
    collection: 'collection',
    references: [{ fieldName: 'field', service: { getAllByIDs: () => {} }, projection: null /*default*/ }],
    fillReferences: false,
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    delete config.events;
    delete config.notifications;
    sinon.restore();
  });

  after(async function () {});

  /**
   * notification with success
   */
  it('should call notification with success', async () => {
    const notificationInfo = {
      serviceName: 'service',
      added: [
        {
          id: 'id1',
          name: 'name',
          field: 'idf1',
        },
      ],
    };

    // stub
    sinon.stub(NotificationsUtils, 'notification').callsFake((conf, notification) => {
      console.log(
        `\nNotificationsUtils.notification called with conf ${JSON.stringify(
          conf,
          null,
          2
        )} and notification ${JSON.stringify(notification, null, 2)}\n`
      );

      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await BaseServiceUtils.notification(config, notificationInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * notification fail validation
   */
  it('should notification fail validation', async () => {
    const notificationInfo = {
      added: [
        {
          id: 'id1',
          name: 'name',
          field: 'idf1',
        },
      ],
    };

    // stub
    sinon.stub(NotificationsUtils, 'notification').callsFake((conf, notification) => {
      console.log(
        `\nNotificationsUtils.notification called with conf ${JSON.stringify(
          conf,
          null,
          2
        )} and notification ${JSON.stringify(notification, null, 2)}\n`
      );

      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await BaseServiceUtils.notification(config, notificationInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.deep.equal('Failed to validate schema. Error: "serviceName" is required');
  }).timeout(10000);
});
