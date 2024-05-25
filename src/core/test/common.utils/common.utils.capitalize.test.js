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
   * capitalize empty
   */
  it('should capitalize empty', async () => {
    // call
    let res = CommonUtils.capitalize('');
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal('');
  }).timeout(10000);

  /**
   * capitalize 1 letter
   */
  it('should capitalize 1 letter', async () => {
    // call
    let res = CommonUtils.capitalize('a');
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal('A');
  }).timeout(10000);

  /**
   * capitalize string
   */
  it('should capitalize string', async () => {
    // call
    let res = CommonUtils.capitalize('str');
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal('Str');
  }).timeout(10000);
});
