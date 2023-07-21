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
   * notValid
   */
  it('should call notValid', async () => {
    let error = 'Test error';

    // call
    let res = await RestMessagesUtils.notValid(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Request is not valid',
      error: 'Test error',
    });
  }).timeout(10000);

  /**
   * notValid nondebug
   */
  it('should call notValid nondebug', async () => {
    let error = 'Test error';

    // stub
    sinon.stub(CommonUtils, 'isDebug').returns(false);

    // call
    let res = await RestMessagesUtils.notValid(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Request is not valid',
    });
  }).timeout(10000);
});
