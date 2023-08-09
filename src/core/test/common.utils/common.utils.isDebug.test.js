const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');

describe('Common Utils', function () {
  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * debug
   */
  it('should be debug in test env', async () => {
    let time = new Date();

    // call
    let res = CommonUtils.isDebug();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(true);
  }).timeout(10000);

  /**
   * nondebug
   */
  it('should be nondebug', async () => {
    let time = new Date();

    sinon.stub(process, 'env').value({});

    // call
    let res = CommonUtils.isDebug();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(false);
  }).timeout(10000);
});
