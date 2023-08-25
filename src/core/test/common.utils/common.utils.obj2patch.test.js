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
   * convert obj2patch
   */
  it('should convert obj to patch', async () => {
    let obj = {
      key1: 'val1',
      key2: 2,
      key3: ['val3'],
      key4: {
        innerKey1: 'innerval1',
        innerKey2: 22,
        innerKey3: ['innerval3'],
        innerKey4: {
          leaf: 'leafval',
        },
      },
    };

    // call
    let res = CommonUtils.obj2patch(obj);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      key1: 'val1',
      key2: 2,
      key3: ['val3'],
      'key4.innerKey1': 'innerval1',
      'key4.innerKey2': 22,
      'key4.innerKey3': ['innerval3'],
      'key4.innerKey4.leaf': 'leafval',
    });
  }).timeout(10000);
});
