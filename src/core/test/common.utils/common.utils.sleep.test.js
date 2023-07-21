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
   * sleep test
   */
  it('should wait after sleep', async () => {
    let time = new Date();

    // call
    await CommonUtils.sleep(100);
    const elapsedTime = new Date() - time;
    console.log(`\nElapsed time: ${JSON.stringify(elapsedTime, null, 2)}\n`);

    // check
    chai.expect(elapsedTime).to.be.greaterThanOrEqual(elapsedTime - 1 /*due to imprecision*/);
  }).timeout(10000);
});
