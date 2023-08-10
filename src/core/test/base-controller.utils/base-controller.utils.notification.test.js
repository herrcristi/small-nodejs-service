const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseControllerUtils = require('../../utils/base-controller.utils.js');

describe('Base Controller', function () {
  const testObjects = [
    { id: 'id1', name: 'name1' },
    { id: 'id2', name: 'name2' },
  ];

  let req;
  let res;
  let next;
  let status;

  before(async function () {});

  beforeEach(async function () {
    req = {
      _ctx: {},
    };

    next = () => {};

    status = 0;
    res = {
      status: sinon.stub().callsFake((s) => {
        console.log(`Status: ${s}`);
        status = s;
        return res;
      }),

      json: sinon.stub().callsFake((json) => {
        console.log(`JSON: ${JSON.stringify(json, null, 2)}`);
        return res;
      }),

      end: sinon.stub(),
    };
  });

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * notification with success
   */
  it('should do notification with success', async () => {
    const serviceName = 'serviceName';
    const service = {
      notification: sinon.stub().callsFake(() => {
        console.log(`\nService.notification called\n`);
        return {
          status: 201,
          value: { id: testObjects[0].id },
        };
      }),
    };

    // call
    await BaseControllerUtils.notification(service, serviceName, req, res, next);

    // check
    chai.expect(status).to.equal(201);
    chai.expect(service.notification.callCount).to.equal(1);
    chai.expect(res.status.callCount).to.equal(1);
    chai.expect(res.json.callCount).to.equal(1);
    chai.expect(res.end.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * notification fail
   */
  it('should notification fail', async () => {
    const serviceName = 'serviceName';
    const service = {
      notification: sinon.stub().callsFake(() => {
        console.log(`\nService.notification called\n`);
        return {
          status: 400,
          error: { message: 'Test error message', error: new Error('Test error').toString() },
        };
      }),
    };

    // call
    await BaseControllerUtils.notification(service, serviceName, req, res, next);

    // check
    chai.expect(status).to.equal(400);
    chai.expect(service.notification.callCount).to.equal(1);
    chai.expect(res.status.callCount).to.equal(1);
    chai.expect(res.json.callCount).to.equal(1);
    chai.expect(res.end.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * notification fail with exception
   */
  it('should get all fail with exception', async () => {
    const serviceName = 'serviceName';
    const service = {
      notification: sinon.stub().callsFake(() => {
        console.log(`\nService.notification called\n`);
        throw new Error('Test error');
      }),
    };

    // call
    await BaseControllerUtils.notification(service, serviceName, req, res, next);

    // check
    chai.expect(status).to.equal(500);
    chai.expect(service.notification.callCount).to.equal(1);
    chai.expect(res.status.callCount).to.equal(1);
    chai.expect(res.json.callCount).to.equal(1);
    chai.expect(res.end.callCount).to.equal(1);
  }).timeout(10000);
});
