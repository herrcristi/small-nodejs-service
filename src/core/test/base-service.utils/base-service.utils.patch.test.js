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
      set: Joi.object().keys({
        name: Joi.string().min(1).max(64),
        field: Joi.string().min(0).max(1024).allow(null),
      }),
      add: Joi.object().keys({
        field: Joi.string().min(0).max(1024).allow(null),
      }),
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
   * patch with success
   */
  it('should call patch with success', async () => {
    const patchInfo = {
      set: {
        name: 'name',
        field: 'idf1',
      },
    };

    config.fillReferences = true;
    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake(() => {
      return {
        value: [
          {
            id: 'idf1',
            name: 'name1',
          },
        ],
      };
    });

    // stub
    sinon.stub(DbOpsUtils, 'patch').callsFake((conf, objID, patch) => {
      console.log(`\nDbOpsUtils.patch called with objid ${objID} and patch ${JSON.stringify(patch, null, 2)}\n`);

      chai.expect(patch).to.deep.equal({
        set: {
          name: 'name',
          field: {
            id: 'idf1',
            name: 'name1',
          },
        },
      });

      return {
        status: 200,
        value: {
          id: objID,
          name: patch.set.name,
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
          chai.expect(notificationType).to.equal('modified');
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
    let res = await BaseServiceUtils.patch(config, 'id1', patchInfo, _ctx);
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
   * patch with success with no events and no notifications
   */
  it('should call patch with success with no events and no notifications', async () => {
    const patchInfo = {
      set: {
        name: 'name',
        field: 'idf1',
      },
    };

    config.fillReferences = true;
    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake(() => {
      return {
        value: [{ id: 'idf1', name: 'name1' }],
      };
    });

    // stub
    sinon.stub(DbOpsUtils, 'patch').callsFake((conf, objID, patch) => {
      console.log(`\nDbOpsUtils.patch called with objid ${objID} and patch ${JSON.stringify(patch, null, 2)}\n`);

      chai.expect(patch).to.deep.equal({
        set: {
          name: 'name',
          field: { id: 'idf1', name: 'name1' },
        },
      });

      return {
        status: 200,
        value: {
          id: objID,
          name: patch.set.name,
          type: undefined,
          status: undefined,
        },
      };
    });

    // call
    let res = await BaseServiceUtils.patch(config, 'id1', patchInfo, _ctx);
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
   * patch with failed validation
   */
  it('should call patch with failed validation', async () => {
    const patchInfo = {
      set: {
        name: 'name',
        prop: 'prop',
      },
    };

    // call
    let res = await BaseServiceUtils.patch(config, 'id1', patchInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('"set.prop" is not allowed');
  }).timeout(10000);

  /**
   * patch with failed db
   */
  it('should call patch with failed db', async () => {
    const patchInfo = {
      set: {
        name: 'name',
      },
    };

    // stub
    sinon.stub(DbOpsUtils, 'patch').callsFake((conf, objID, obj) => {
      return { status: 500, error: { message: 'Test message error', error: new Error('Test error').toString() } };
    });

    // call
    let res = await BaseServiceUtils.patch({ ...config, translate: null }, 'id1', patchInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message).to.include('Test message error');
  }).timeout(10000);

  /**
   * patch with set.references fail
   */
  it('should call patch with set.references fail ', async () => {
    const patchInfo = {
      set: {
        name: 'name',
        field: 'idf1',
      },
    };

    config.fillReferences = true;
    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake(() => {
      return {
        status: 400,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // stub
    sinon.stub(DbOpsUtils, 'patch').callsFake((conf, objID, patch) => {
      console.log(`\nDbOpsUtils.patch called with objid ${objID} and patch ${JSON.stringify(patch, null, 2)}\n`);

      return {
        status: 200,
        value: {
          id: objID,
          name: patch.set.name,
          type: undefined,
          status: undefined,
        },
      };
    });

    // call
    let res = await BaseServiceUtils.patch(config, 'id1', patchInfo, _ctx);
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
   * patch with add.references fail
   */
  it('should call patch with add.references fail ', async () => {
    const patchInfo = {
      set: {
        name: 'name',
      },
      add: {
        field: 'idf1',
      },
    };

    config.fillReferences = true;
    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake(() => {
      return {
        status: 400,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // stub
    sinon.stub(DbOpsUtils, 'patch').callsFake((conf, objID, patch) => {
      console.log(`\nDbOpsUtils.patch called with objid ${objID} and patch ${JSON.stringify(patch, null, 2)}\n`);

      return {
        status: 200,
        value: {
          id: objID,
          name: patch.set.name,
          type: undefined,
          status: undefined,
        },
      };
    });

    // call
    let res = await BaseServiceUtils.patch(config, 'id1', patchInfo, _ctx);
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
});
