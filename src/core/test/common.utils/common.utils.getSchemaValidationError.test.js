const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const CommonUtils = require('../../utils/common.utils.js');

describe('Common Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getSchemaValidationError filter
   */
  it('should getSchemaValidationError filter', async () => {
    let v = {
      error: {
        details: [
          {
            message: 'Test error',
          },
        ],
      },
    };
    let objInfo = {
      name: 'John',
    };

    // call
    let res = CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Failed to validate schema. Error: Test error',
        error: new Error('Failed to validate schema. Error: Test error'),
      },
    });
  }).timeout(10000);
});
