const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

const RestMessagesUtils = require('../../utils/rest-messages.utils.js');
const CommonUtils = require('../../utils/common.utils.js');

describe('Rest Messages Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * notFound
   */
  it('should call notFound', async () => {
    let error = 'Test error';

    // call
    let res = await RestMessagesUtils.notFound(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Not found',
      error: 'Test error',
    });
  }).timeout(10000);

  /**
   * notFound nondebug
   */
  it('should call notFound nondebug', async () => {
    let error = 'Test error';

    // stub
    sinon.stub(CommonUtils, 'isDebug').returns(false);

    // call
    res = await RestMessagesUtils.notFound(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Not found',
    });
  }).timeout(10000);
});
