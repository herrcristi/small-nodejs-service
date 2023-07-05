const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');

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
    console.log(`\nElapsed time: ${JSON.stringify(elapsedTime, null, 2)}\n`);

    // check
    chai.expect(elapsedTime).to.be.greaterThanOrEqual(elapsedTime - 1 /*due to imprecision*/);
  }).timeout(10000);

  /**
   * uuid test
   */
  it('should get a random uuid', async () => {
    let time = new Date();

    // call
    let res = CommonUtils.uuid();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.be.a('string');
    chai.expect(res.length).to.equal(36);
  }).timeout(10000);

  /**
   * compact uuid test
   */
  it('should get a compact uuid', async () => {
    let time = new Date();

    // call
    let res = CommonUtils.uuidc();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.be.a('string');
    chai.expect(res.length).to.equal(32);
    chai.expect(res.toUpperCase()).to.equal(res);
  }).timeout(10000);

  /**
   * chunks
   */
  it('should get proper chunks', async () => {
    let time = new Date();

    let array = [1, 2, 3];

    // 0
    let res = CommonUtils.getChunks(array, 0);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([array]);

    // 1
    res = CommonUtils.getChunks(array, 1);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([[1], [2], [3]]);

    // 2
    res = CommonUtils.getChunks(array, 2);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([[1, 2], [3]]);

    // 3
    res = CommonUtils.getChunks(array, 3);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([[1, 2, 3]]);

    // 4
    res = CommonUtils.getChunks(array, 3);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([[1, 2, 3]]);

    // empty
    res = CommonUtils.getChunks([], 3);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([]);

    // empty
    res = CommonUtils.getChunks([], 0);
    console.log(`\nTest returned: ${JSON.stringify(res)}\n`);
    chai.expect(res).to.deep.equal([]);
  }).timeout(10000);
});
