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
      field: Joi.string().min(0).max(1024).allow(null),
    }),
    collection: 'collection',
    translate: () => {},
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
   * post with success
   */
  it('should call post with success', async () => {
    const objInfo = {
      name: 'name',
      field: 'idf1',
    };

    config.fillReferences = true;
    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake(() => {
      return {
        value: [
          {
            id: 'idf1',
            name: 'name1',
            type: 'typef1',
          },
        ],
      };
    });

    // stub
    sinon.stub(DbOpsUtils, 'post').callsFake((config, obj) => {
      console.log(`\nDbOpsUtils.post called with obj ${JSON.stringify(obj, null, 2)}\n`);

      chai.expect(obj).to.deep.equal({
        name: 'name',
        field: {
          id: 'idf1',
          name: 'name1',
          type: 'typef1',
        },
      });

      return {
        status: 200,
        value: {
          ...obj,
          id: 'id1',
          type: 'type',
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
          chai.expect(notificationType).to.equal('added');
          chai.expect(objs).to.deep.equal([
            {
              id: 'id1',
            },
          ]);
        }),
      },
      projection: { id: 1 },
    };

    // call
    let res = await BaseServiceUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: 'id1',
        name: 'name',
        type: 'type',
      },
    });
    chai.expect(config.events.service.post.callCount).to.equal(1);
    chai.expect(config.notifications.service.raiseNotification.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * post with failed validation
   */
  it('should call post with failed validation', async () => {
    const objInfo = {
      name: 'name',
      prop: 'prop',
    };

    // call
    let res = await BaseServiceUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('"prop" is not allowed');
  }).timeout(10000);

  /**
   * post with failed db
   */
  it('should call post with failed db', async () => {
    const objInfo = {
      name: 'name',
    };

    // stub
    sinon.stub(DbOpsUtils, 'post').callsFake((conf, obj) => {
      return { status: 500, error: { message: 'Test message error', error: new Error('Test error').toString() } };
    });

    // call
    let res = await BaseServiceUtils.post({ ...config, translate: null }, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message).to.include('Test message error');
  }).timeout(10000);

  /**
   * post with references fail
   */
  it('should call post with references fail', async () => {
    const objInfo = {
      name: 'name',
      field: 'idf1',
    };

    config.fillReferences = true;
    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake(() => {
      return {
        status: 400,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // stub
    sinon.stub(DbOpsUtils, 'post').callsFake((config, obj) => {
      console.log(`\nDbOpsUtils.post called with obj ${JSON.stringify(obj, null, 2)}\n`);

      return {
        status: 200,
        value: {
          id: 'id1',
          ...obj,
        },
      };
    });

    // call
    let res = await BaseServiceUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * post with success with no events and no notifications
   */
  it('should call post with success with no events and no notifications', async () => {
    const objInfo = {
      name: 'name',
      field: 'idf1',
    };

    config.fillReferences = true;
    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake(() => {
      return {
        value: [{ id: 'idf1', name: 'name1', type: 'typef1' }],
      };
    });

    // stub
    sinon.stub(DbOpsUtils, 'post').callsFake((config, obj) => {
      console.log(`\nDbOpsUtils.post called with obj ${JSON.stringify(obj, null, 2)}\n`);

      chai.expect(obj).to.deep.equal({
        name: 'name',
        field: { id: 'idf1', name: 'name1', type: 'typef1' },
      });

      return {
        status: 200,
        value: {
          ...obj,
          id: 'id1',
          type: 'type',
        },
      };
    });

    // call
    let res = await BaseServiceUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: 'id1',
        name: 'name',
        type: 'type',
      },
    });
  }).timeout(10000);

  /**
   * post with success with default notifications
   */
  it('should call post with success with default notifications', async () => {
    const objInfo = {
      name: 'name',
      field: 'idf1',
    };

    config.fillReferences = true;
    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake(() => {
      return {
        value: [{ id: 'idf1', name: 'name1', type: 'typef1' }],
      };
    });

    // stub
    sinon.stub(DbOpsUtils, 'post').callsFake((config, obj) => {
      console.log(`\nDbOpsUtils.post called with obj ${JSON.stringify(obj, null, 2)}\n`);

      chai.expect(obj).to.deep.equal({
        name: 'name',
        field: { id: 'idf1', name: 'name1', type: 'typef1' },
      });

      return {
        status: 200,
        value: {
          ...obj,
          id: 'id1',
          type: 'type',
        },
      };
    });

    config.notifications = {
      service: {
        raiseNotification: sinon.stub().callsFake((notificationType, objs) => {
          console.log(`\nNotification called with ${notificationType} and ${JSON.stringify(objs, null, 2)}\n`);
          chai.expect(notificationType).to.equal('added');
          chai.expect(objs).to.deep.equal([
            {
              id: 'id1',
              name: 'name',
              type: 'type',
            },
          ]);
        }),
      },
      projection: null,
    };

    // call
    let res = await BaseServiceUtils.post(config, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: 'id1',
        name: 'name',
        type: 'type',
      },
    });

    chai.expect(config.notifications.service.raiseNotification.callCount).to.equal(1);
  }).timeout(10000);
});
