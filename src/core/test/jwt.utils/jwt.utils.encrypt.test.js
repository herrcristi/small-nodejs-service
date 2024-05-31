const jwt = require('jsonwebtoken');

const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');
const JwtUtils = require('../../utils/jwt.utils.js');

describe('Jwt Utils', function () {
  const issuer = 'encrypt';

  before(async function () {
    await JwtUtils.init(issuer);
  });

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * encrypt test
   */
  it('should encrypt with success with default password', async () => {
    // call
    let res = JwtUtils.encrypt({ test: 'test' }, issuer, {});
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.length).to.equal(150);
  }).timeout(10000);

  /**
   * encrypt test with provided password
   */
  it('should encrypt with success with provided password', async () => {
    const password = '00001111222233334444555566667777'; // 32 bytes length
    const iv = Buffer.from('0011223344556677'); // 16 bytes length

    // call
    let res = JwtUtils.encrypt({ test: 'test' }, issuer, {}, password, iv);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value:
        '303031313232333334343535363637371d9ad6826fa4f5449bea3a25634bb94c911ee6b467a41330d8fd53bca0474fc706d6fee8b1c31079c5e448a2d95676effe04ac0fe04b01ef4e3610',
    });
  }).timeout(10000);
});
