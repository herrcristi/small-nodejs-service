const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');

const TranslationsUtils = require('../../utils/translations.utils.js');

describe('Translations Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * initEmails
   */
  it('should init Language', async () => {
    let translations = {
      'reset-password': {
        subject: 'Reset password',
        email: './en.email.reset-password.html',
      },
    };

    const emailContent = 'email html text';

    let stub = sinon.stub(fs, 'readFileSync');
    stub.onCall(0).returns(JSON.stringify(translations));
    stub.onCall(1).returns(emailContent);
    stub.onCall(2).returns(JSON.stringify(translations));
    stub.onCall(3).returns(emailContent);

    // call
    let res = await TranslationsUtils.initEmails('en', 'filename', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    res = await TranslationsUtils.initEmails('ro', 'filename', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(4);
    chai.expect(res).to.deep.equal({
      en: {
        'reset-password': {
          subject: 'Reset password',
          email: emailContent,
        },
      },
      ro: {
        'reset-password': {
          subject: 'Reset password',
          email: emailContent,
        },
      },
    });
  }).timeout(10000);

  /**
   * fail to initEmails
   */
  it('should fail to init Language', async () => {
    let stub = sinon.stub(fs, 'readFileSync').callsFake(() => {
      throw new Error('Test error');
    });

    // call
    let res = await TranslationsUtils.initEmails('en', 'filename', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res).to.equal(null);
  }).timeout(10000);
});
