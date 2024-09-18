const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');
const JwtUtils = require('../../utils/jwt.utils.js');

describe('Jwt Utils', function () {
  const issuer = 'init';

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * init with success
   */
  it('should init with success', async () => {
    const time = new Date();

    // call
    await JwtUtils.init(issuer, [process.env.AUTHPASS]);

    // test by generate a valid token
    const rT = JwtUtils.getJwt({ test: 'test' }, issuer, {});
    console.log(`\nGenerate token: ${JSON.stringify(rT)}\n`);

    // call
    let res = JwtUtils.validateJwt(rT.value, issuer, {});
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { test: 'test' },
    });
  }).timeout(10000);

  /**
   * init fail no passwords
   */
  it('should init fail no passwords ', async () => {
    const time = new Date();

    // call
    let exceptionThrown = false;
    try {
      await JwtUtils.init(issuer); // no password
    } catch (e) {
      chai.expect(e.message).to.include('Password required');
      exceptionThrown = true;
    }

    chai.expect(exceptionThrown).to.equal(true);
  }).timeout(10000);

  /**
   * init fail password is not array
   */
  it('should init fail no password set', async () => {
    const time = new Date();

    // call
    let exceptionThrown = false;
    try {
      await JwtUtils.init(issuer, 'pass');
    } catch (e) {
      chai.expect(e.message).to.include('Password required');
      exceptionThrown = true;
    }

    chai.expect(exceptionThrown).to.equal(true);
  }).timeout(10000);

  /**
   * init fail password is not array
   */
  it('should init fail no password set', async () => {
    const time = new Date();

    // call
    let exceptionThrown = false;
    try {
      await JwtUtils.init(issuer, ['pass']);
    } catch (e) {
      chai.expect(e.message).to.include('Password must  have 32 bytes');
      exceptionThrown = true;
    }

    chai.expect(exceptionThrown).to.equal(true);
  }).timeout(10000);
});
