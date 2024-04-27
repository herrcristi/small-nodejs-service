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
   * decrypt  test
   */
  it('should decrypt a string', async () => {
    const iv = Buffer.from('0123456789012345'); // 16 bytes
    const password = '01234567890123456789012345678901'; // 32 bytes length

    // call
    let res = CommonUtils.encrypt('string', password, iv);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.be.a('string');
    chai.expect(res).to.equal('303132333435363738393031323334354b6e35487ed93880ae81aebeedb5207b4d1abc0c2ecd');

    // decrypt
    const encrypted = res;
    res = CommonUtils.decrypt(encrypted, password);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res).to.be.a('string');
    chai.expect(res).to.equal('string');

    // decrypt with alter tag
    res = CommonUtils.decrypt(encrypted + '00', password);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res.error).to.deep.equal({
      message: 'Unsupported state or unable to authenticate data',
      error: new Error('Unsupported state or unable to authenticate data'),
    });

    // decrypt with alter tag
    let e2 = '12' + encrypted.slice(2);
    res = CommonUtils.decrypt(e2, password);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res.error).to.deep.equal({
      message: 'Unsupported state or unable to authenticate data',
      error: new Error('Unsupported state or unable to authenticate data'),
    });

    // decrypt diff password
    const password2 = '00001111222233334444555566667777'; // 32 bytes length

    res = CommonUtils.decrypt(encrypted, password2);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res.error).to.deep.equal({
      message: 'Unsupported state or unable to authenticate data',
      error: new Error('Unsupported state or unable to authenticate data'),
    });
  }).timeout(10000);
});
