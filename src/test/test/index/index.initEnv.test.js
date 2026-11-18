const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const fs = require('fs');
const Index = require('../../../index.js');

describe('Index', function () {
  const _ctx = { reqID: 'testReq', lang: 'en' };

  // secrets that are accepted in production (test values)
  const strongSecrets = {
    SMALL_API_SALT: '6f1c9a3e7b2d4085e1a9c3b7d2f4e60a8c1b3d5e7f90214365879abcdef01234',
    SMALL_API_S2SPASS: '9d4b7e1a3c6f0825b9e2d7a4c1f6083e',
    SMALL_API_PREVAUTHPASS: '2a7c5e9f1b3d6084c2e8a5f1d7b3096e',
    SMALL_API_AUTHPASS: '5e8b2d6a0c4f9173e6b1a8d3f5c0927b',
  };

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
      ...strongSecrets,
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

  /**
   * initEnv portal school id must be a UUID
   */
  it('should initEnv fail for a portal school id that is not a UUID', async () => {
    // stub: a portal school id that is not a UUID, and the exit
    sinon.stub(process, 'env').value({
      ...process.env,
      SMALL_API_PORTAL_SCHOOL_ID: 'not-a-uuid',
    });
    const stubProcessExit = sinon.stub(process, 'exit').callsFake((code) => {
      console.log(`\nProcess exit called with code ${code}`);
    });

    // call
    const res = await Index.initEnv();

    // check: refused, the process exits
    chai.expect(res).to.equal(false);
    chai.expect(stubProcessExit.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * the secrets: placeholders, weak values and a shared service password are refused in production
   */
  it('should initEnv refuse placeholder, weak or shared secrets in production', async () => {
    // stub: the exit and the environment
    const stubProcessExit = sinon.stub(process, 'exit');
    const env = sinon.stub(process, 'env');

    // each wrong secret, the others strong: refused
    for (const secrets of [
      { SMALL_API_AUTHPASS: '00001111222233334444555566667777' }, // the example value
      { SMALL_API_SALT: 'bccc'.repeat(16) }, // the example salt
      { SMALL_API_PREVAUTHPASS: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }, // weak
      { SMALL_API_S2SPASS: strongSecrets.SMALL_API_AUTHPASS }, // the same key for sessions and internal calls
      { SMALL_API_S2SPASS: strongSecrets.SMALL_API_PREVAUTHPASS },
    ]) {
      env.value({ ...process.env, NODE_ENV: 'production', ...strongSecrets, ...secrets });
      const res = await Index.initEnv();
      chai.expect(res).to.equal(false);
    }

    // check: the process exits for each one
    chai.expect(stubProcessExit.callCount).to.equal(5);
  }).timeout(10000);

  /**
   * in debug mode the example secrets are accepted, with a warning
   */
  it('should initEnv accept the example secrets in debug mode only (a warning)', async () => {
    // stub: the exit, and the example secrets in debug mode
    const stubProcessExit = sinon.stub(process, 'exit');
    sinon.stub(process, 'env').value({
      ...process.env,
      NODE_ENV: 'dev',
      ...strongSecrets,
      SMALL_API_S2SPASS: '00001111222233334444555566667777',
      SMALL_API_AUTHPASS: '00001111222233334444555566667777',
    });

    // call
    const res = await Index.initEnv();

    // check: accepted, no exit
    chai.expect(res).to.equal(true);
    chai.expect(stubProcessExit.callCount).to.equal(0);
  }).timeout(10000);
});
