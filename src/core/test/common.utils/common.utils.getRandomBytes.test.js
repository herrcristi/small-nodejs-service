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
   * getRandomBytes  test
   */
  it('should get a random string', async () => {
    // call
    let res = CommonUtils.getRandomBytes();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res instanceof Buffer).to.be.true;
    chai.expect(res.length).to.equal(32);

    const strHex = res.toString('hex');
    chai.expect(strHex).to.be.a('string');
    chai.expect(strHex.length).to.equal(64);
  }).timeout(10000);
});
