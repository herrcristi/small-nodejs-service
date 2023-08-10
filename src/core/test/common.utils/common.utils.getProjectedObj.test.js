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
   * project obj
   */
  it('should project obj', async () => {
    let obj = {
      name: 'user',
      type: 'type',
      password: 'pass',
    };

    let projection = { name: 1, type: 0, status: 1 };

    // call
    let res = CommonUtils.getProjectedObj(obj, projection);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({ name: 'user' });

    // empty projection
    projection = {};

    res = CommonUtils.getProjectedObj(obj, projection);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.deep.equal({});
  }).timeout(10000);

  /**
   * null obj
   */
  it('should project nu ', async () => {
    let projection = { name: 1, type: 0, status: 1 };

    // undefined
    let obj = undefined;

    // call
    let res = CommonUtils.getProjectedObj(obj, projection);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(undefined);

    // null
    obj = null;

    res = CommonUtils.getProjectedObj(obj, projection);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.equal(null);
  }).timeout(10000);
});
