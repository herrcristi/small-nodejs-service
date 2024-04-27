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
  it('should encrypt with success', async () => {
    // call
    let res = JwtUtils.encrypt({ test: 'test' }, issuer, {});
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.length).to.equal(150);
  }).timeout(10000);
});
