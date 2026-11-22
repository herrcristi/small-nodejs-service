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

    // check: the reason is sent (detail)
    chai.expect(res).to.deep.equal({
      message: 'Request is not valid',
      detail: 'Test error',
      error: 'Test error',
    });
  }).timeout(10000);

  /**
   * only a 400 gives its reason outside debug mode: 401, 403, 404 and 500 keep their generic text
   */
  it('should give the reason only for 400 outside debug mode', async () => {
    // stub: production (no debug details)
    sinon.stub(CommonUtils, 'isDebug').returns(false);
    const error = { message: 'The user is not a member of the current school', error: new Error('not a member') };

    // case 400: the reason the service wrote
    const res400 = await RestMessagesUtils.statusError(400, error, _ctx);
    chai.expect(res400).to.deep.equal({
      message: 'Request is not valid',
      detail: 'The user is not a member of the current school',
    });

    // cases 401, 403, 404, 500: only the generic text (no detail, no error)
    for (const status of [401, 403, 404, 500]) {
      const res = await RestMessagesUtils.statusError(status, error, _ctx);
      chai.expect(Object.keys(res), `${status}`).to.deep.equal(['message']);
    }
  }).timeout(10000);

  /**
   * status error 401
   */
  it('should call statusError 401', async () => {
    let error = 'Test error';

    // call
    let res = await RestMessagesUtils.statusError(401, error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Request is not authorized',
      error: 'Test error',
    });
  }).timeout(10000);

  /**
   * status error 403
   */
  it('should call statusError 403', async () => {
    let error = 'Test error';

    // call
    let res = await RestMessagesUtils.statusError(403, error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Request is not having enough permissions',
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

  /**
   * a conflict (409) and a content type that is not supported (415) give their reason, so the user knows what to change
   */
  it('should give the reason of a conflict and of a content type that is not supported', async () => {
    // stub: production (no debug details)
    sinon.stub(CommonUtils, 'isDebug').returns(false);

    // call
    const res409 = await RestMessagesUtils.statusError(409, { message: '"name" is already used' }, _ctx);
    const res415 = await RestMessagesUtils.statusError(415, { message: 'Request body must be JSON' }, _ctx);

    // check: the generic text and the reason
    chai.expect(res409).to.deep.equal({
      message: 'Request is in conflict with the current data',
      detail: '"name" is already used',
    });
    chai.expect(res415).to.deep.equal({
      message: 'Request has a content type that is not supported',
      detail: 'Request body must be JSON',
    });

    // case: without a reason
    chai.expect(await RestMessagesUtils.statusError(409, null, _ctx)).to.deep.equal({
      message: 'Request is in conflict with the current data',
    });
    chai.expect(await RestMessagesUtils.statusError(415, null, _ctx)).to.deep.equal({
      message: 'Request has a content type that is not supported',
    });
  }).timeout(10000);
});
