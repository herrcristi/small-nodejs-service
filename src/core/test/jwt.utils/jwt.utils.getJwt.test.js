const jwt = require('jsonwebtoken');

const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');
const JwtUtils = require('../../utils/jwt.utils.js');

describe('Jwt Utils', function () {
  const issuer = 'getJwt';

  before(async function () {
    await JwtUtils.init(issuer);
  });

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getJwt test
   */
  it('should getJwt with success', async () => {
    // call
    let stubJwt = sinon.stub(jwt, 'sign').callsFake((payload, secret, options) => {
      console.log(`\njwt.sign called for ${JSON.stringify({ payload, options }, null, 2)}\n`);

      chai.expect(payload).to.deep.equal({ data: { test: 'test' } });
      chai.expect(options).to.deep.equal({ algorithm: 'HS512', expiresIn: '12h', issuer });
      return 'token';
    });

    let res = JwtUtils.getJwt({ test: 'test' }, issuer, {});
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: 'token',
    });
  }).timeout(10000);
});
