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
   * get all with success
   */
  it('should get all with success', async () => {
    const serviceName = 'serviceName';
    const service = {
      getAllForReq: sinon.stub().callsFake(() => {
        console.log(`\nService.getAllForReq called\n`);
        return {
          status: 200,
          value: {
            data: testObjects,
            meta: {
              count: testObjects.length,
              skip: 0,
              limit: 0,
            },
          },
        };
      }),
    };

    // call
    await BaseControllerUtils.getAll(service, serviceName, req, res, next);

    // check
    chai.expect(status).to.equal(200);
    chai.expect(service.getAllForReq.callCount).to.equal(1);
    chai.expect(res.status.callCount).to.equal(1);
    chai.expect(res.json.callCount).to.equal(1);
    chai.expect(res.end.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * get all fail
   */
  it('should get all fail', async () => {
    const serviceName = 'serviceName';
    const service = {
      getAllForReq: sinon.stub().callsFake(() => {
        console.log(`\nService.getAllForReq called\n`);
        return {
          status: 400,
          error: { message: 'Test error message', error: new Error('Test error').toString() },
        };
      }),
    };

    // call
    await BaseControllerUtils.getAll(service, serviceName, req, res, next);

    // check
    chai.expect(status).to.equal(400);
    chai.expect(service.getAllForReq.callCount).to.equal(1);
    chai.expect(res.status.callCount).to.equal(1);
    chai.expect(res.json.callCount).to.equal(1);
    chai.expect(res.end.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * get all fail with exception
   */
  it('should get all fail with exception', async () => {
    const serviceName = 'serviceName';
    const service = {
      getAllForReq: sinon.stub().callsFake(() => {
        console.log(`\nService.getAllForReq called\n`);
        throw new Error('Test error');
      }),
    };

    // call
    await BaseControllerUtils.getAll(service, serviceName, req, res, next);

    // check
    chai.expect(status).to.equal(500);
    chai.expect(service.getAllForReq.callCount).to.equal(1);
    chai.expect(res.status.callCount).to.equal(1);
    chai.expect(res.json.callCount).to.equal(1);
    chai.expect(res.end.callCount).to.equal(1);
  }).timeout(10000);
});
