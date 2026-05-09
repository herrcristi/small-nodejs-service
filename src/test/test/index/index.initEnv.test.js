const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const fs = require('fs');
const Index = require('../../../index.js');

describe('Index', function () {
  const _ctx = { reqID: 'testReq', lang: 'en' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * initEnv success
   */
  it('should initEnv with success', async () => {
    // call
    let res = await Index.initEnv();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(true);
  }).timeout(10000);

  /**
   * initEnv production success
   */
  it('should initEnv for production with success', async () => {
    // stub
    let stubEnv = (stub = sinon.stub(process, 'env').value({
      ...process.env,
      NODE_ENV: undefined, // should default to production
    }));

    // call
    let res = await Index.initEnv();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(true);
  }).timeout(10000);

  /**
   * initEnv not found
   */
  it('should init not found', async () => {
    // stub
    let stubEnv = (stub = sinon.stub(process, 'env').value({
      ...process.env,
      SMALL_API_URL: undefined,
    }));

    let stubProcessExit = sinon.stub(process, 'exit').callsFake((code) => {
      console.log(`\nProcess exit called with code ${code}`);
    });

    // call
    let res = await Index.initEnv();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(false);
    chai.expect(stubProcessExit.callCount).to.equal(1);
  }).timeout(10000);
});
