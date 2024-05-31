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
   * encrypt  test
   */
  it('should encrypt a string', async () => {
    const iv = Buffer.from('0123456789012345'); // 16 bytes
    const password = '01234567890123456789012345678901'; // 32 bytes length

    // call
    let res = CommonUtils.encrypt('string', password, iv);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: '303132333435363738393031323334354b6e35487ed93880ae81aebeedb5207b4d1abc0c2ecd',
    });

    // call again with different iv
    res = CommonUtils.encrypt('string', password);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value).to.not.equal('303132333435363738393031323334354b6e35487ed93880ae81aebeedb5207b4d1abc0c2ecd');
  }).timeout(10000);
});
