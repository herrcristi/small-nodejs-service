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
   * notPermissions
   */
  it('should call notPermissions', async () => {
    let error = 'Test error';

    // call
    let res = await RestMessagesUtils.notPermissions(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Request is not having enough permissions',
      error: 'Test error',
    });
  }).timeout(10000);

  /**
   * notPermissions nondebug
   */
  it('should call notPermissions nondebug', async () => {
    let error = 'Test error';

    // stub
    sinon.stub(CommonUtils, 'isDebug').returns(false);

    // call
    let res = await RestMessagesUtils.notPermissions(error, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      message: 'Request is not having enough permissions',
    });
  }).timeout(10000);
});
