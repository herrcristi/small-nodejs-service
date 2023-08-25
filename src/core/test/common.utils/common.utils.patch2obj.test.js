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
        'innerkey5.innerKey51': 'val5',
        'innerkey5.innerKey52.leaf521': 'leafval521',
        'innerkey5.innerKey52.leaf522': 'leafval522',
      },
      key5: 'this will be overridden',
      'key5.innerKey1': 'val5',
      'key5.innerKey2.leaf1': 'leafval1',
      'key5.innerKey2.leaf2': 'leafval2',
    };

    // call
    let res = CommonUtils.patch2obj(obj);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
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
        innerkey5: {
          innerKey51: 'val5',
          innerKey52: {
            leaf521: 'leafval521',
            leaf522: 'leafval522',
          },
        },
      },
      key5: {
        innerKey1: 'val5',
        innerKey2: {
          leaf1: 'leafval1',
          leaf2: 'leafval2',
        },
      },
    });
  }).timeout(10000);
});
