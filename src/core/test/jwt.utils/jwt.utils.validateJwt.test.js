const jwt = require('jsonwebtoken');

const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');
const JwtUtils = require('../../utils/jwt.utils.js');

describe('Jwt Utils', function () {
  const issuer = 'validateJwt';

  before(async function () {
    await JwtUtils.init(issuer);
  });

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * validateJwt test success
   */
  it('should validateJwt with success', async () => {
    // generate a valid token
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
   * validateJwt test fail due to issuer
   */
  it('should validateJwt with success', async () => {
    const token =
      'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InRlc3QiOiJ0ZXN0In0sImlhdCI6MTcxMzI5NzU0MywiZXhwIjoxNzEzMzgzOTQzLCJpc3MiOiJ2YWxpZGF0ZUp3dCJ9.RM5szWtdt9lekksxTahe5SdGv3DcjWN98WpXo0lFoaYx7NwNTp41PQ5VZNzmgoo35TE7QVpitb7LWXXOYEjBmg';

    let res = JwtUtils.validateJwt(token, issuer, {});
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Invalid jwt',
        error: new Error('Invalid jwt'),
      },
    });
  }).timeout(10000);
});
