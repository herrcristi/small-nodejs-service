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
   * protect data and remove sensitive fields
   */
  it('should protect data and remove sensitive fields', async () => {
    let data = {
      name: 'user',
      password: 'pass',
    };

    // call
    let res = CommonUtils.protectData(data);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({ ...data, password: undefined });
  }).timeout(10000);
});
