const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const Joi = require('joi');

const BaseServiceUtils = require('../../utils/base-service.utils.js');
const DbOpsUtils = require('../../utils/db-ops.utils.js');

describe('Base Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  const config = {
    serviceName: 'service',
    schema: Joi.object().keys({
      name: Joi.string().min(1).max(64),
      description: Joi.string().min(0).max(1024).allow(null),
    }),
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
   * delete with success
   */
  it('should call delete with success', async () => {
    // stub
    sinon.stub(DbOpsUtils, 'delete').callsFake((conf, objID) => {
      return {
        status: 200,
        value: {
          id: objID,
          name: 'name',
          type: undefined,
          status: undefined,
        },
      };
    });

    config.events = {
      service: {
        post: sinon.stub().callsFake((event) => {
          console.log(`\nEvents called with ${JSON.stringify(event, null, 2)}\n`);
        }),
      },
    };

    config.notifications = {
      service: {
        raiseNotification: sinon.stub().callsFake((notificationType, objs) => {
          console.log(`\nNotification called with ${notificationType} and ${JSON.stringify(objs, null, 2)}\n`);
          chai.expect(notificationType).to.equal('removed');
          chai.expect(objs).to.deep.equal([
            {
              id: 'id1',
            },
          ]);
        }),
      },
      projection: { id: 1, status: 0 },
    };

    // call
    let res = await BaseServiceUtils.delete(config, 'id1', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: 'id1',
        name: 'name',
      },
    });
    chai.expect(config.events.service.post.callCount).to.equal(1);
    chai.expect(config.notifications.service.raiseNotification.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * delete with success with no events and no notifications
   */
  it('should call delete with success with no events and no notifications', async () => {
    // stub
    sinon.stub(DbOpsUtils, 'delete').callsFake((conf, objID) => {
      return {
        status: 200,
        value: {
          id: objID,
          name: 'name',
        },
      };
    });

    // call
    let res = await BaseServiceUtils.delete(config, 'id1', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: 'id1',
        name: 'name',
      },
    });
  }).timeout(10000);

  /**
   * delete with failed db
   */
  it('should call delete with failed db', async () => {
    // stub
    sinon.stub(DbOpsUtils, 'delete').callsFake((conf, objID) => {
      return { status: 500, error: { message: 'Test message error', error: new Error('Test error').toString() } };
    });

    // call
    let res = await BaseServiceUtils.delete(config, 'id1', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message).to.include('Test message error');
  }).timeout(10000);
});
