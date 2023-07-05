const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.cjs');

describe('Tests', function () {
  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  afterEach(async function () {});

  /**
   * sleep test
   */
  it('should wait after sleep', async () => {
    let time = new Date();

    // call
    await CommonUtils.sleep(100);
    const elapsedTime = new Date() - time;
    console.log(`\nElapsed time: ${elapsedTime}`);

    // check
    expect(elapsedTime).to.be.greaterThanOrEqual(elapsedTime - 1 /*due to imprecision*/);
  }).timeout(10000);
});
