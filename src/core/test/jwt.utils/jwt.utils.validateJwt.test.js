const jwt = require('jsonwebtoken');

const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');
const JwtUtils = require('../../utils/jwt.utils.js');

describe('Jwt Utils', function () {
  const issuer = 'validateJwt';

  before(async function () {
    await JwtUtils.init(issuer, [process.env.SMALL_API_AUTHPASS]);
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
   * validateJwt test fail
   */
  it('should validateJwt fail', async () => {
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

  /**
   * the password is never used as a key: the jwt is signed with a derived key and encrypted with another one
   */
  it('should sign and encrypt with keys derived from the password, not with the password', async () => {
    const password = process.env.SMALL_API_AUTHPASS;

    // a jwt signed with the password itself is not valid
    const signedWithPassword = jwt.sign({ data: { test: 'test' } }, password, { algorithm: 'HS512', issuer });
    chai.expect(JwtUtils.validateJwt(signedWithPassword, issuer, {}).status).to.equal(401);

    // data encrypted with the password itself can not be decrypted with the keys of the issuer
    const encryptedWithPassword = JwtUtils.encrypt({ test: 'test' }, issuer, {}, password).value;
    chai.expect(JwtUtils.decrypt(encryptedWithPassword, issuer, {}).status).to.equal(401);

    // and the jwt of the issuer is not accepted by the password itself
    const token = JwtUtils.getJwt({ test: 'test' }, issuer, {}).value;
    chai.expect(() => jwt.verify(token, password, { algorithms: ['HS512'], issuer })).to.throw();

    // with the keys of the issuer both work
    chai.expect(JwtUtils.validateJwt(token, issuer, {}).value).to.deep.equal({ test: 'test' });
    const encrypted = JwtUtils.encrypt({ test: 'test' }, issuer, {}).value;
    chai.expect(JwtUtils.decrypt(encrypted, issuer, {}).value).to.deep.equal({ test: 'test' });
  }).timeout(10000);

  /**
   * key rotation: a token of the previous password is still accepted
   */
  it('should accept a jwt of the previous password', async () => {
    const rotation = 'validateJwt-rotation';
    await JwtUtils.init(rotation, [process.env.SMALL_API_PREVAUTHPASS]);
    const oldToken = JwtUtils.getJwt({ test: 'old' }, rotation, {}).value;
    const oldEncrypted = JwtUtils.encrypt({ test: 'old' }, rotation, {}).value;

    await JwtUtils.init(rotation, [process.env.SMALL_API_PREVAUTHPASS, process.env.SMALL_API_AUTHPASS]);
    chai.expect(JwtUtils.validateJwt(oldToken, rotation, {}).value).to.deep.equal({ test: 'old' });
    chai.expect(JwtUtils.decrypt(oldEncrypted, rotation, {}).value).to.deep.equal({ test: 'old' });
  }).timeout(10000);
});
