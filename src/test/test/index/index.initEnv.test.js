const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

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
   * initEnv not found
   */
  it('should init not found', async () => {
    // stub
    let stubFs = sinon.stub(fs, 'existsSync').callsFake(() => {
      console.log(`\nfs.existsSync will return false`);
      return false;
    });

    // call
    let res = await Index.initEnv();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(false);
    chai.expect(stubFs.callCount).to.equal(1);
  }).timeout(10000);
});
