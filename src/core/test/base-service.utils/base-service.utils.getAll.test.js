const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');
const RestMessagesUtils = require('../../utils/rest-messages.utils.js');
const BaseControllerUtils = require('../../utils/base-controller.utils.js');
const RestApiUtils = require('../../utils/rest-api.utils.js');

describe('Rest Messages Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  let res = {};

  let next = () => {};

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAll with success
   */
  it('should call getAll with success', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
    };

    // stub
    sinon.stub(RestApiUtils, 'buildMongoFilterFromReq').returns({
      filter: {},
    });

    let controller = {
      name: 'Service',
      schema: 'schema',
      service: {
        getAll: sinon.stub().callsFake(() => {
          return { value: [] };
        }),

        getAllCount: sinon.stub().callsFake(() => {
          return { value: 0 };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.getAll(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.getAll.callCount).to.equal(1);
    chai.expect(controller.service.getAllCount.callCount).to.equal(1);

    chai.expect(response).to.deep.equal({
      status: 200,
      value: {
        data: [],
        meta: {
          count: 0,
          limit: 0,
          skip: 0,
          sort: undefined,
        },
      },
    });
  }).timeout(10000);

  /**
   * getAll with success - partial result
   */
  it('should call getAll with success - partial result', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
    };

    // stub
    sinon.stub(RestApiUtils, 'buildMongoFilterFromReq').returns({
      filter: {},
      limit: 1,
    });

    let controller = {
      name: 'Service',
      schema: 'schema',
      service: {
        getAll: sinon.stub().callsFake(() => {
          return { value: [{ id: 'id1' }] };
        }),

        getAllCount: sinon.stub().callsFake(() => {
          return { value: 2 };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.getAll(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.getAll.callCount).to.equal(1);
    chai.expect(controller.service.getAllCount.callCount).to.equal(1);

    chai.expect(response).to.deep.equal({
      status: 206,
      value: {
        data: [
          {
            id: 'id1',
          },
        ],
        meta: {
          count: 2,
          limit: 1,
          skip: 0,
          sort: undefined,
        },
      },
    });
  }).timeout(10000);

  /**
   * getAll with success - limit zero, skip non zero -> 200
   */
  it('should call getAll with success - limit zero, skip non zero -> 200', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
    };

    // stub
    sinon.stub(RestApiUtils, 'buildMongoFilterFromReq').returns({
      filter: {},
      limit: 0,
      skip: 1,
    });

    let controller = {
      name: 'Service',
      schema: 'schema',
      service: {
        getAll: sinon.stub().callsFake(() => {
          return { value: [{ id: 'id1' }] };
        }),

        getAllCount: sinon.stub().callsFake(() => {
          return { value: 2 };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.getAll(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.getAll.callCount).to.equal(1);
    chai.expect(controller.service.getAllCount.callCount).to.equal(1);

    chai.expect(response).to.deep.equal({
      status: 200,
      value: {
        data: [
          {
            id: 'id1',
          },
        ],
        meta: {
          count: 2,
          limit: 0,
          skip: 1,
          sort: undefined,
        },
      },
    });
  }).timeout(10000);

  /**
   * getAll with fail to build query
   */
  it('should call getAll with fail to build query', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
    };

    // stub
    sinon.stub(RestApiUtils, 'buildMongoFilterFromReq').returns({
      error: { message: 'Test error message', error: new Error('Test error').toString() },
    });

    let controller = {
      name: 'Service',
      schema: 'schema',
      service: {
        getAll: sinon.stub().callsFake(() => {
          return { value: [{ id: 'id1' }] };
        }),

        getAllCount: sinon.stub().callsFake(() => {
          return { value: 1 };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.getAll(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.getAll.callCount).to.equal(0);
    chai.expect(controller.service.getAllCount.callCount).to.equal(0);

    chai.expect(response).to.deep.equal({
      status: 400,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * fail to getAll
   */
  it('should fail to getAll', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
    };

    // stub
    sinon.stub(RestApiUtils, 'buildMongoFilterFromReq').returns({
      filter: {},
    });

    let controller = {
      name: 'Service',
      schema: 'schema',
      service: {
        getAll: sinon.stub().callsFake(() => {
          return { error: { message: 'Test error message', error: new Error('Test error').toString() } };
        }),

        getAllCount: sinon.stub().callsFake(() => {
          return { value: 2 };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.getAll(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.getAll.callCount).to.equal(1);
    chai.expect(controller.service.getAllCount.callCount).to.equal(0);

    chai.expect(response).to.deep.equal({
      status: 500,
      error: 'Error: Test error',
    });
  }).timeout(10000);

  /**
   * fail to getAllCount
   */
  it('should fail to getAllCount', async () => {
    let req = {
      _ctx: _.cloneDeep(_ctx),
    };

    // stub
    sinon.stub(RestApiUtils, 'buildMongoFilterFromReq').returns({
      filter: {},
    });

    let controller = {
      name: 'Service',
      schema: 'schema',
      service: {
        getAll: sinon.stub().callsFake(() => {
          return [{ id: 'id1' }];
        }),

        getAllCount: sinon.stub().callsFake(() => {
          return { error: { message: 'Test error message', error: new Error('Test error').toString() } };
        }),
      },
    };

    // call
    let response = await BaseControllerUtils.getAll(controller, req, res, next);
    console.log(`\nTest returned: ${JSON.stringify(response, null, 2)}\n`);

    // check
    chai.expect(controller.service.getAll.callCount).to.equal(1);
    chai.expect(controller.service.getAllCount.callCount).to.equal(1);

    chai.expect(response).to.deep.equal({
      status: 500,
      error: 'Error: Test error',
    });
  }).timeout(10000);
});
