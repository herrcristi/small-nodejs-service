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
   * exception with stack
   */
  it('should call exception with stack', async () => {
    let error = {
      stack: 'Stack trace',
    };

    // call
    let res = await RestMessagesUtils.exception(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'An unknown error has occured',
      error: 'Stack trace',
    });
  }).timeout(10000);

  /**
   * exception without stack
   */
  it('should call exception without stack', async () => {
    let error = 'Test error';

    // call
    res = await RestMessagesUtils.exception(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'An unknown error has occured',
      error: 'Test error',
    });
  }).timeout(10000);

  /**
   * exception nondebug
   */
  it('should call exception nondebug', async () => {
    let error = 'Test error';

    // stub
    sinon.stub(CommonUtils, 'isDebug').returns(false);

    // call
    res = await RestMessagesUtils.exception(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'An unknown error has occured',
    });
  }).timeout(10000);
});
