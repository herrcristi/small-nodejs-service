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

    // check: the reason (detail) and, in debug, the error
    chai.expect(res).to.deep.equal({
      message: 'Request is not valid',
      detail: 'Test error',
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

    // check: the reason is also sent in production, the error is not
    chai.expect(res).to.deep.equal({
      message: 'Request is not valid',
      detail: 'Test error',
    });
  }).timeout(10000);

  /**
   * notValid with the error of a service: the reason is its message, not the stack
   */
  it('should give the message of a service error as the reason', async () => {
    const error = { message: 'You cannot remove yourself as admin', error: new Error('You cannot remove yourself') };

    // stub: production
    sinon.stub(CommonUtils, 'isDebug').returns(false);

    // call
    const res = await RestMessagesUtils.notValid(error, _ctx);

    // check: only the message the service wrote
    chai.expect(res).to.deep.equal({
      message: 'Request is not valid',
      detail: 'You cannot remove yourself as admin',
    });
  }).timeout(10000);

  /**
   * notValid without a message: no reason
   */
  it('should give no reason for an error without a message', async () => {
    // stub: production
    sinon.stub(CommonUtils, 'isDebug').returns(false);

    // call with no error, then with an error object without a text message
    const resNone = await RestMessagesUtils.notValid(undefined, _ctx);
    const resObject = await RestMessagesUtils.notValid({ code: 11000 }, _ctx);

    // check: only the generic text
    chai.expect(resNone).to.deep.equal({ message: 'Request is not valid' });
    chai.expect(resObject).to.deep.equal({ message: 'Request is not valid' });
  }).timeout(10000);
});
