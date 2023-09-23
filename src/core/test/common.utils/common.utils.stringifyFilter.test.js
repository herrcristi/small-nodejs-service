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
   * stringify filter
   */
  it('should stringify filter', async () => {
    // call
    let res = JSON.stringify(
      {
        id: 'id1',
        search: /name/i,
      },
      CommonUtils.stringifyFilter
    );
    console.log(`\nTest returned: ${res}\n`);

    // check
    chai.expect(res).to.equal('{"id":"id1","search":"/name/i"}');
  }).timeout(10000);
});
