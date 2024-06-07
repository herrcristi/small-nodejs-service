const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const Joi = require('joi');

const ReferencesUtils = require('../../utils/base-service.references.utils.js');
const DbOpsUtils = require('../../utils/db-ops.utils.js');

describe('Base Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  const config = {
    serviceName: 'service',
    collection: 'collection',
    references: [
      {
        fieldName: 'target',
        service: { getAllByIDs: () => {}, Constants: { ServiceName: 'serviceRef' } },
        projection: null /*default*/,
      },
    ],
    fillReferences: true,
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
    config.fillReferences = true;
  });

  after(async function () {});

  /**
   * onNotificationReferences skipping with success
   */
  it('should call onNotificationReferences skipping with success', async () => {
    const notification = {
      serviceName: 'serviceRef',
      added: [
        {
          id: 'id1',
          name: 'name1',
        },
      ],
    };

    config.fillReferences = false;

    // call
    let res = await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: null,
    });
  }).timeout(10000);

  /**
   * onNotificationReferences different service
   */
  it('should call onNotificationReferences different service', async () => {
    const notification = {
      serviceName: 'serviceRef-different',
      added: [
        {
          id: 'id1',
          name: 'name1',
        },
      ],
    };

    // call
    let res = await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: null,
    });
  }).timeout(10000);

  /**
   * onNotificationReferences added skipped with success
   */
  it('should call onNotificationReferences added skipped with success', async () => {
    const notification = {
      serviceName: 'serviceRef',
      added: [
        {
          id: 'id1',
          name: 'name1',
        },
      ],
    };

    // call
    let res = await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: null,
    });
  }).timeout(10000);

  /**
   * onNotificationReferences added applied with success (for array)
   */
  it('should call onNotificationReferences added applied with success (for array)', async () => {
    const notification = {
      serviceName: 'serviceRef',
      added: [
        {
          id: 'id1',
          name: 'name1',
          [config.serviceName]: ['targetID'], // field must match config.serviceName
        },
      ],
    };

    // stub
    let stubDB = sinon.stub(DbOpsUtils, 'addManyReferences').callsFake((config, targetsIDs, ref, obj) => {
      console.log(
        `\nDbOpsUtils.addManyReferences service called with ${JSON.stringify({ ref, targetsIDs, obj }, null, 2)}`
      );
      chai.expect(targetsIDs).to.deep.equal(['targetID']);
      chai.expect(ref).to.deep.include({ fieldName: 'target' });
      chai.expect(obj).to.deep.equal({ id: 'id1', name: 'name1' });

      return {
        status: 200,
        value: 1,
      };
    });

    // call
    let res = await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDB.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * onNotificationReferences added applied with success (for non-array)
   */
  it('should call onNotificationReferences added applied with success (for non-array)', async () => {
    const notification = {
      serviceName: 'serviceRef',
      added: [
        {
          id: 'id1',
          name: 'name1',
          [config.serviceName]: { id: 'targetID' }, // field must match config.serviceName
        },
      ],
    };

    // stub
    let stubDB = sinon.stub(DbOpsUtils, 'addManyReferences').callsFake((config, targetsIDs, ref, obj) => {
      console.log(
        `\nDbOpsUtils.addManyReferences service called with ${JSON.stringify({ ref, targetsIDs, obj }, null, 2)}`
      );
      chai.expect(targetsIDs).to.deep.equal(['targetID']);
      chai.expect(ref).to.deep.include({ fieldName: 'target' });
      chai.expect(obj).to.deep.equal({ id: 'id1', name: 'name1' });

      return {
        status: 200,
        value: 1,
      };
    });

    // call
    let res = await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDB.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * onNotificationReferences added applied with success with no targetids
   */
  it('should call onNotificationReferences added applied with success with no targetids', async () => {
    const notification = {
      serviceName: 'serviceRef',
      added: [
        {
          id: 'id1',
          name: 'name1',
          [config.serviceName]: 1, // field must match config.serviceName
        },
      ],
    };

    // stub
    let stubDB = sinon.stub(DbOpsUtils, 'addManyReferences').callsFake((config, targetsIDs, ref, obj) => {
      console.log(
        `\nDbOpsUtils.addManyReferences service called with ${JSON.stringify({ ref, targetsIDs, obj }, null, 2)}`
      );
      chai.expect(targetsIDs).to.deep.equal([]);
      chai.expect(ref).to.deep.include({ fieldName: 'target' });
      chai.expect(obj).to.deep.equal({ id: 'id1', name: 'name1' });

      return {
        status: 200,
        value: 1,
      };
    });

    // call
    let res = await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDB.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * onNotificationReferences added with error
   */
  it('should call onNotificationReferences added with error', async () => {
    const notification = {
      serviceName: 'serviceRef',
      added: [
        {
          id: 'id1',
          name: 'name1',
          [config.serviceName]: 'targetID', // field must match config.serviceName
        },
      ],
    };

    // stub
    let stubDB = sinon.stub(DbOpsUtils, 'addManyReferences').callsFake((config, targetsIDs, ref, obj) => {
      console.log(
        `\nDbOpsUtils.addManyReferences service called with ${JSON.stringify({ ref, targetsIDs, obj }, null, 2)}`
      );
      return {
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDB.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      error: {
        error: 'Error: Test error',
        message: 'Test error message',
      },
    });
  }).timeout(10000);

  /**
   * onNotificationReferences modified with success
   */
  it('should call onNotificationReferences modified with success', async () => {
    const notification = {
      serviceName: 'serviceRef',
      modified: [
        {
          id: 'id1',
          name: 'name1',
        },
      ],
    };

    let stubDB = sinon.stub(DbOpsUtils, 'updateManyReferences').callsFake((config, ref, obj) => {
      console.log(
        `\nDbOpsUtils.updateManyReferences service called with ref ${JSON.stringify(ref)} and obj ${JSON.stringify(
          obj
        )}`
      );
      chai.expect(ref).to.deep.include({ fieldName: 'target' });
      chai.expect(obj).to.deep.equal({ id: 'id1', name: 'name1' });

      return {
        status: 200,
        value: 1,
      };
    });

    // call
    let res = await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDB.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * onNotificationReferences modified with fail
   */
  it('should call onNotificationReferences modified with fail', async () => {
    const notification = {
      serviceName: 'serviceRef',
      modified: [
        {
          id: 'id1',
          name: 'name1',
        },
      ],
    };

    let stubDB = sinon.stub(DbOpsUtils, 'updateManyReferences').callsFake((config, ref, obj) => {
      console.log(
        `\nDbOpsUtils.updateManyReferences service called with ref ${JSON.stringify(ref)} and obj ${JSON.stringify(
          obj
        )}`
      );
      return {
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDB.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      error: {
        error: 'Error: Test error',
        message: 'Test error message',
      },
    });
  }).timeout(10000);

  /**
   * onNotificationReferences removed with success
   */
  it('should call onNotificationReferences removed with success', async () => {
    const notification = {
      serviceName: 'serviceRef',
      removed: [
        {
          id: 'id1',
          name: 'name1',
        },
      ],
    };

    let stubDB = sinon.stub(DbOpsUtils, 'deleteManyReferences').callsFake((config, ref, obj) => {
      console.log(
        `\nDbOpsUtils.deleteManyReferences service called with ref ${JSON.stringify(ref)} and obj ${JSON.stringify(
          obj
        )}`
      );
      chai.expect(ref).to.deep.include({ fieldName: 'target' });
      chai.expect(obj).to.deep.equal({ id: 'id1', name: 'name1' });

      return {
        status: 200,
        value: 1,
      };
    });

    // call
    let res = await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDB.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

  /**
   * onNotificationReferences removed with fail
   */
  it('should call onNotificationReferences removed with fail', async () => {
    const notification = {
      serviceName: 'serviceRef',
      removed: [
        {
          id: 'id1',
          name: 'name1',
        },
      ],
    };

    let stubDB = sinon.stub(DbOpsUtils, 'deleteManyReferences').callsFake((config, ref, obj) => {
      console.log(
        `\nDbOpsUtils.deleteManyReferences service called with ref ${JSON.stringify(ref)} and obj ${JSON.stringify(
          obj
        )}`
      );
      return {
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await ReferencesUtils.onNotificationReferences(config, notification, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDB.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      error: {
        error: 'Error: Test error',
        message: 'Test error message',
      },
    });
  }).timeout(10000);
});
