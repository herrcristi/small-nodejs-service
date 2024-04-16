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
   * getHash  test
   */
  it('should get hash string', async () => {
    // call
    let res = CommonUtils.getHash('string', 'salt');
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.be.a('string');
    chai
      .expect(res)
      .to.equal(
        'da1ab660656df278c49ab2cf1dd5b10645f2e2250f57774b6953280d5f2f5bab11911284a091c8d8ba423c16f6e9c85ed7ca800baa06bafaf947ebb26ff92612'
      );
  }).timeout(10000);
});
