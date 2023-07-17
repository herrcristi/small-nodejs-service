const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');
const RestMessagesUtils = require('../../utils/rest-messages.utils.js');
const RestControllerUtils = require('../../utils/rest-controller.utils.js');

describe('Rest Messages Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  let controller = {
    name: 'Service',
    schema: 'schema',
    service: null,
  };

  let req = {
    _ctx,
  };

  let next = () => {};

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * reply with success
   */
  it('should call reply with success', async () => {
    let result = {
      status: 200,
      value: { data: 'data' },
    };

    let res = {
      status: sinon.stub().callsFake(function (status) {
        console.log(`\nStatus: ${JSON.stringify(status, null, 2)}\n`);
        chai.expect(status).to.equal(result.status);
        return this;
      }),

      json: sinon.stub().callsFake(function (json) {
        console.log(`\nJson: ${JSON.stringify(json, null, 2)}\n`);
        chai.expect(json).to.deep.equal(result.value);
        return this;
      }),

      end: sinon.stub().callsFake(function () {
        return this;
      }),
    };

    // call
    await RestControllerUtils.reply(controller, result, req, res, next);

    // check
    chai.expect(res.status.callCount).to.equal(1);
    chai.expect(res.json.callCount).to.equal(1);
    chai.expect(res.end.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * reply with error
   */
  it('should call reply with error', async () => {
    let result = {
      status: 400,
      error: { message: 'Request invalid', error: new Error('Request invalid').toString() },
    };

    let res = {
      status: sinon.stub().callsFake(function (status) {
        console.log(`\nStatus: ${JSON.stringify(status, null, 2)}\n`);
        chai.expect(status).to.equal(result.status);
        return this;
      }),

      json: sinon.stub().callsFake(function (json) {
        console.log(`\nJson: ${JSON.stringify(json, null, 2)}\n`);
        chai.expect(json).to.deep.equal({
          message: 'Request is not valid',
          error: result.error,
        });
        return this;
      }),

      end: sinon.stub().callsFake(function () {
        return this;
      }),
    };

    // call
    await RestControllerUtils.reply(controller, result, req, res, next);

    // check
    chai.expect(res.status.callCount).to.equal(1);
    chai.expect(res.json.callCount).to.equal(1);
    chai.expect(res.end.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * reply with exception
   */
  it('should call reply with exception', async () => {
    let result = {
      status: 400,
      error: { message: 'Request invalid', error: new Error('Request invalid').toString() },
    };

    let res = {
      status: sinon.stub(),

      json: sinon.stub().callsFake(function (json) {
        console.log(`\nJson: ${JSON.stringify(json, null, 2)}\n`);
        chai.expect(json).to.deep.include({
          message: 'An unknown error has occured',
        });
        return this;
      }),

      end: sinon.stub().callsFake(function () {
        return this;
      }),
    };

    sinon.stub(RestMessagesUtils, 'statusError').throws('Test exception');

    res.status.onCall(0).callsFake(function (status) {
      console.log(`\nStatus: ${JSON.stringify(status, null, 2)}\n`);
      chai.expect(status).to.equal(result.status);
      return res;
    });
    res.status.onCall(1).callsFake(function (status) {
      console.log(`\nStatus: ${JSON.stringify(status, null, 2)}\n`);
      chai.expect(status).to.equal(500);
      return res;
    });

    // call
    await RestControllerUtils.reply(controller, result, req, res, next);

    // check
    chai.expect(res.status.callCount).to.equal(2);
    chai.expect(res.json.callCount).to.equal(1);
    chai.expect(res.end.callCount).to.equal(1);
  }).timeout(10000);
});
