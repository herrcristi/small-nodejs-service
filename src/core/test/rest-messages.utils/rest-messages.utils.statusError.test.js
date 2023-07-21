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
   * status error 400
   */
  it('should call statusError 400', async () => {
    let error = 'Test error';

    // call
    let res = await RestMessagesUtils.statusError(400, error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Request is not valid',
      error: 'Test error',
    });
  }).timeout(10000);

  /**
   * status error 404
   */
  it('should call statusError 404', async () => {
    let error = 'Test error';

    // call
    res = await RestMessagesUtils.statusError(404, error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Not found',
      error: 'Test error',
    });
  }).timeout(10000);

  /**
   * status error 500
   */
  it('should call statusError 500', async () => {
    let error = 'Test error';

    // call
    res = await RestMessagesUtils.statusError(500, error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'An unknown error has occured',
      error: 'Test error',
    });
  }).timeout(10000);

  /**
   * status error other
   */
  it('should call statusError other', async () => {
    let error = 'Test error';

    // call
    res = await RestMessagesUtils.statusError(501, error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'An unknown error has occured',
      error: 'Test error',
    });
  }).timeout(10000);

  /**
   * status error other null
   */
  it('should call statusError other null', async () => {
    let error = 'Test error';

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
