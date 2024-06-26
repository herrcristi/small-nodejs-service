const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');
const JwtUtils = require('../../utils/jwt.utils.js');

describe('Jwt Utils', function () {
  const issuer = 'init';
  let clock = null;

  before(async function () {});

  beforeEach(async function () {
    clock = sinon.useFakeTimers();
  });

  afterEach(async function () {
    clock.restore();
    sinon.restore();
  });

  after(async function () {});

  /**
   * init with success
   */
  it('should init with success', async () => {
    const time = new Date();

    const one_day = 24 * 60 * 60 * 1000;

    // stub
    let stubPass = sinon.stub(CommonUtils, 'getRandomBytes').callThrough();

    // call
    let res = await JwtUtils.init(issuer);

    chai.expect(stubPass.callCount).to.equal(1);

    clock.tick(one_day + 10);

    // check
    const endTime = new Date();
    console.log(`\nElapsed time: ${endTime - time}`);

    chai.expect(stubPass.callCount).to.equal(2);
    chai.expect(endTime - time).to.be.greaterThanOrEqual(one_day); // 1 day
  }).timeout(10000);
});
