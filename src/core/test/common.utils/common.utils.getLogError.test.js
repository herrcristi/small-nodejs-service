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
   * getLogError stack
   */
  it('should getLogError stack', async () => {
    let e = {
      stack: 'Stack',
    };

    // call
    let res = CommonUtils.getLogError(e);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(e.stack);
  }).timeout(10000);

  /**
   * getLogError string
   */
  it('should getLogError string', async () => {
    let e = 'string';

    // call
    let res = CommonUtils.getLogError(e);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(e);
  }).timeout(10000);

  /**
   * getLogError message
   */
  it('should getLogError message string', async () => {
    let e = { message: 'string' };

    // call
    let res = CommonUtils.getLogError(e);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(e.message);
  }).timeout(10000);

  /**
   * getLogError object
   */
  it('should getLogError object', async () => {
    let e = { a: 1 };

    // call
    let res = CommonUtils.getLogError(e);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(JSON.stringify(e));
  }).timeout(10000);

  /**
   * getLogError undefined
   */
  it('should getLogError undefined', async () => {
    let e = undefined;

    // call
    let res = CommonUtils.getLogError(e);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(JSON.stringify(undefined));
  }).timeout(10000);

  /**
   * getLogError null
   */
  it('should getLogError null', async () => {
    let e = null;

    // call
    let res = CommonUtils.getLogError(e);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(JSON.stringify(null));
  }).timeout(10000);
});
