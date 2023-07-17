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
   * chunks
   */
  it('should get proper chunks', async () => {
    let array = [1, 2, 3];

    // 0
    let res = CommonUtils.getChunks(array, 0);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([array]);

    // 1
    res = CommonUtils.getChunks(array, 1);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([[1], [2], [3]]);

    // 2
    res = CommonUtils.getChunks(array, 2);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([[1, 2], [3]]);

    // 3
    res = CommonUtils.getChunks(array, 3);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([[1, 2, 3]]);

    // 4
    res = CommonUtils.getChunks(array, 3);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([[1, 2, 3]]);

    // empty
    res = CommonUtils.getChunks([], 3);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([]);

    // empty
    res = CommonUtils.getChunks([], 0);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([]);
  }).timeout(10000);
});
