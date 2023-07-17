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

    ///
    // non-debug
    sinon.stub(CommonUtils, 'isDebug').returns(false);
    // call
    res = await RestMessagesUtils.notValid(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Request is not valid',
    });
  }).timeout(10000);

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

    ///
    // non-debug
    sinon.stub(CommonUtils, 'isDebug').returns(false);
    // call
    res = await RestMessagesUtils.notFound(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Not found',
    });
  }).timeout(10000);

  /**
   * exception
   */
  it('should call exception', async () => {
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

    ///
    // normal error
    error = 'Test error';

    // call
    res = await RestMessagesUtils.exception(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'An unknown error has occured',
      error: 'Test error',
    });

    ///
    // non-debug
    sinon.stub(CommonUtils, 'isDebug').returns(false);
    // call
    res = await RestMessagesUtils.exception(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'An unknown error has occured',
    });
  }).timeout(10000);

  /**
   * status error
   */
  it('should call statusError', async () => {
    ///
    // 400 error
    let error = 'Test error';

    // call
    let res = await RestMessagesUtils.statusError(400, error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Request is not valid',
      error: 'Test error',
    });

    ///
    // 404 error
    error = 'Test error';

    // call
    res = await RestMessagesUtils.statusError(404, error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Not found',
      error: 'Test error',
    });

    ///
    // 500 error
    error = 'Test error';

    // call
    res = await RestMessagesUtils.statusError(500, error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'An unknown error has occured',
      error: 'Test error',
    });

    ///
    // other error
    error = 'Test error';

    // call
    res = await RestMessagesUtils.statusError(501, error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'An unknown error has occured',
      error: 'Test error',
    });

    ///
    // other null error
    error = 'Test error';

    // call
    res = await RestMessagesUtils.statusError(501, null, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'An unknown error has occured',
      error: 'Error',
    });
  }).timeout(10000);
});
