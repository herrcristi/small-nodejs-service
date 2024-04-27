const jwt = require('jsonwebtoken');

const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');
const JwtUtils = require('../../utils/jwt.utils.js');

describe('Jwt Utils', function () {
  const issuer = 'decrypt';

  before(async function () {
    await JwtUtils.init(issuer);
  });

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * decrypt test success
   */
  it('should decrypt with success', async () => {
    let res = JwtUtils.encrypt({ test: 'test' }, issuer, {});
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);

    // decrypt
    const encrypted = res.value;
    res = JwtUtils.decrypt(encrypted, issuer, {});
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        test: 'test',
      },
    });
  }).timeout(10000);

  /**
   * decrypt test fail
   */
  it('should decrypt fail', async () => {
    // call
    res = JwtUtils.decrypt('dummy data', issuer, {});
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 401,

      error: {
        message: 'Cannot decrypt data',
        error: new Error('Cannot decrypt data'),
      },
    });
  }).timeout(10000);

  /**
   * decrypt test fail diff issuer
   */
  it('should decrypt fail diff issuer', async () => {
    let stubDecrypt = sinon.stub(CommonUtils, 'decrypt').callsFake(() => {
      console.log(`\nCommonUtils.decrypt called\n`);

      return JSON.stringify({ data: {}, issuer: 'unknown' });
    });

    // call
    res = JwtUtils.decrypt('dummy data', issuer, {});
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 401,

      error: {
        message: 'Cannot decrypt data',
        error: new Error('Cannot decrypt data'),
      },
    });
  }).timeout(10000);
});
