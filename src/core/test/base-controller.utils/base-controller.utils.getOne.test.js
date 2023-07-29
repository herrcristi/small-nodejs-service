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
      params: {
        id: 'id1',
      },
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
   * getOne with success
   */
  it('should getOne with success', async () => {
    const serviceName = 'serviceName';
    const service = {
      getOne: sinon.stub().callsFake(() => {
        console.log(`\nService.getOne called\n`);
        return {
          status: 200,
          value: testObjects[0],
        };
      }),
    };

    // call
    await BaseControllerUtils.getOne(service, serviceName, req, res, next);

    // check
    chai.expect(status).to.equal(200);
    chai.expect(service.getOne.callCount).to.equal(1);
    chai.expect(res.status.callCount).to.equal(1);
    chai.expect(res.json.callCount).to.equal(1);
    chai.expect(res.end.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * getOne fail
   */
  it('should getOne fail', async () => {
    const serviceName = 'serviceName';
    const service = {
      getOne: sinon.stub().callsFake(() => {
        console.log(`\nService.getOne called\n`);
        return {
          status: 400,
          error: { message: 'Test error message', error: new Error('Test error').toString() },
        };
      }),
    };

    // call
    await BaseControllerUtils.getOne(service, serviceName, req, res, next);

    // check
    chai.expect(status).to.equal(400);
    chai.expect(service.getOne.callCount).to.equal(1);
    chai.expect(res.status.callCount).to.equal(1);
    chai.expect(res.json.callCount).to.equal(1);
    chai.expect(res.end.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * getOne fail with exception
   */
  it('should get all fail with exception', async () => {
    const serviceName = 'serviceName';
    const service = {
      getOne: sinon.stub().callsFake(() => {
        console.log(`\nService.getOne called\n`);
        throw new Error('Test error');
      }),
    };

    // call
    await BaseControllerUtils.getOne(service, serviceName, req, res, next);

    // check
    chai.expect(status).to.equal(500);
    chai.expect(service.getOne.callCount).to.equal(1);
    chai.expect(res.status.callCount).to.equal(1);
    chai.expect(res.json.callCount).to.equal(1);
    chai.expect(res.end.callCount).to.equal(1);
  }).timeout(10000);
});
