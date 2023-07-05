const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');

describe('Tests', function () {
  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  afterEach(async function () {});

  /**
   * test
   */
  it('should return -1 when the value is not present', async () => {
    assert.equal([1, 2, 3].indexOf(4), -1);
  }).timeout(10000);
});
