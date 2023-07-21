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
   * compact uuid test
   */
  it('should get a compact uuid', async () => {
    // call
    let res = CommonUtils.uuidc();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.be.a('string');
    chai.expect(res.length).to.equal(32);
    chai.expect(res.toUpperCase()).to.equal(res);
  }).timeout(10000);
});
