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
   * convert hasCommonFields
   */
  it('should check if hasCommonFields', async () => {
    // call
    let res = CommonUtils.hasCommonFields([
      {
        field1: 1,
      },
      {
        field2: 1,
      },
    ]);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(false);

    // call
    res = CommonUtils.hasCommonFields([
      {
        field1: 1,
      },
      {
        field2: 1,
        field3: [],
      },
      {
        field1: {},
      },
    ]);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.equal(true);
  }).timeout(10000);

  /**
   * convert hasCommonFields fail not array
   */
  it('should hasCommonFields fail not array', async () => {
    // call
    let res = CommonUtils.hasCommonFields({
      field1: 1,
    });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(false);
  }).timeout(10000);
});
